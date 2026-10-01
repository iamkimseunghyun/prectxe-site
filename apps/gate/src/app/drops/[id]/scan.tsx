import { CameraView, useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { VerdictOverlay } from '@/components/verdict-overlay';
import { colors, space } from '@/constants/theme';
import { GateApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { vibrate } from '@/lib/feedback';
import { approvePending, judge, type Verdict } from '@/lib/judge';
import { useNetworkUp } from '@/lib/online';
import { getDrop, getGate } from '@/lib/roster';
import { useRoster } from '@/lib/use-roster';

// 판정 화면이 떠 있는 시간 (PRD: 1.5초 뒤 자동으로 다음 스캔). 빨강은 사유를
// 관객에게 안내해야 해서 조금 더 둔다. 둘 다 화면을 누르면 바로 넘어간다
const SHOW_MS = { green: 1500, red: 3000 } as const;
// 판정 화면이 닫힌 뒤에도 같은 QR이 카메라 앞에 있으면 "이미 입장"이 또 뜬다
const SAME_QR_PAUSE_MS = 3000;
// 서버가 한 번 답하지 않으면 잠시 기기 명단으로만 판정한다 — 매 스캔마다
// 0.8초씩 기다리면 줄이 밀린다
const SERVER_RETRY_MS = 5000;

export default function ScanScreen() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth = useAuth();
  const [title] = useState(() => getDrop(id)?.title ?? '');
  const [gate] = useState(() => getGate(id));
  const [permission, requestPermission] = useCameraPermissions();
  const networkUp = useNetworkUp();
  const { stats, refreshStats, sync } = useRoster(id, { poll: true });

  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [judging, setJudging] = useState(false);
  const [serverReachable, setServerReachable] = useState(true);
  const busy = useRef(false);
  const lastFailureAt = useRef(0);
  // 마지막으로 판정한 QR — 판정 화면이 닫힌 뒤 잠시 같은 QR을 무시한다
  const recent = useRef<{ data: string; until: number } | null>(null);

  // 명단 폴링 결과로도 서버 연결 상태를 갱신한다
  useEffect(() => {
    if (sync.dataUpdatedAt) setServerReachable(true);
  }, [sync.dataUpdatedAt]);
  useEffect(() => {
    if (sync.error instanceof GateApiError && sync.error.status === 0)
      setServerReachable(false);
  }, [sync.error]);

  const offline = !networkUp || !serverReachable;

  const handle = useCallback(
    async (data: string) => {
      const drop = getDrop(id);
      if (busy.current || !drop || !gate) return;
      const now = Date.now();
      if (recent.current?.data === data && now < recent.current.until) return;

      busy.current = true;
      setJudging(true);
      try {
        const tryServer =
          networkUp &&
          (serverReachable || now - lastFailureAt.current > SERVER_RETRY_MS);
        const outcome = await judge({
          request: auth.request,
          drop,
          gate,
          data,
          tryServer,
        });
        if (outcome.reachedServer === true) setServerReachable(true);
        if (outcome.reachedServer === false) {
          setServerReachable(false);
          lastFailureAt.current = Date.now();
        }
        recent.current = { data, until: Number.POSITIVE_INFINITY };
        vibrate(outcome.verdict.color);
        AccessibilityInfo.announceForAccessibility(outcome.verdict.title);
        setVerdict(outcome.verdict);
        refreshStats();
      } finally {
        busy.current = false;
        setJudging(false);
      }
    },
    [id, gate, networkUp, serverReachable, auth.request, refreshStats]
  );

  const dismiss = useCallback(() => {
    setVerdict(null);
    if (recent.current)
      recent.current = {
        ...recent.current,
        until: Date.now() + SAME_QR_PAUSE_MS,
      };
  }, []);

  const approve = useCallback(() => {
    const drop = getDrop(id);
    if (!drop || !gate || verdict?.color !== 'yellow') return;
    approvePending(drop, gate, verdict.pending);
    vibrate('green');
    setVerdict({
      color: 'green',
      title: '입장',
      name: '명단 밖 입장',
      tier: '수동 승인',
      offline: true,
    });
    refreshStats();
  }, [id, gate, verdict, refreshStats]);

  useEffect(() => {
    if (!verdict || verdict.color === 'yellow') return;
    const timer = setTimeout(dismiss, SHOW_MS[verdict.color]);
    return () => clearTimeout(timer);
  }, [verdict, dismiss]);

  const scanning = permission?.granted && !verdict && !judging;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      {permission?.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanning ? ({ data }) => handle(data) : undefined}
        />
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.close}
          >
            <Text style={styles.closeLabel}>닫기</Text>
          </Pressable>
          <View style={styles.titleBox}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.gate}>{gate} 입구</Text>
          </View>
          <Text
            style={styles.counter}
            accessibilityLabel={`입장 ${stats.entered}명, 발권 ${stats.total}장`}
          >
            {stats.entered}/{stats.total}
          </Text>
        </View>

        {offline && (
          <View style={styles.offline} accessibilityLiveRegion="polite">
            <Text style={styles.offlineLabel}>
              오프라인 · 기기 명단으로 판정 중
              {stats.pending > 0 ? ` · 올릴 기록 ${stats.pending}건` : ''}
            </Text>
          </View>
        )}

        <View style={styles.center} pointerEvents="box-none">
          {permission === null ? null : !permission.granted ? (
            <PermissionPrompt
              canAsk={permission.canAskAgain}
              onRequest={requestPermission}
            />
          ) : (
            <View style={styles.frame} pointerEvents="none">
              {judging && (
                <ActivityIndicator color={colors.text} size="large" />
              )}
            </View>
          )}
        </View>

        {__DEV__ && <DevTokenInput onSubmit={handle} />}
      </SafeAreaView>

      {verdict && (
        <VerdictOverlay
          verdict={verdict}
          onDismiss={dismiss}
          onApprove={approve}
        />
      )}
    </View>
  );
}

function PermissionPrompt({
  canAsk,
  onRequest,
}: {
  canAsk: boolean;
  onRequest: () => void;
}) {
  return (
    <View style={styles.permission}>
      <Text style={styles.permissionText}>
        {canAsk
          ? '입장권 QR을 스캔하려면 카메라 권한이 필요합니다.'
          : '카메라 권한이 꺼져 있습니다. 설정에서 카메라를 허용해주세요.'}
      </Text>
      <Button
        label={canAsk ? '카메라 허용' : '설정 열기'}
        onPress={canAsk ? onRequest : () => Linking.openSettings()}
      />
    </View>
  );
}

// 시뮬레이터에는 카메라가 없다 — 개발 빌드에서만 토큰을 직접 넣어 판정해본다
function DevTokenInput({ onSubmit }: { onSubmit: (data: string) => void }) {
  const [value, setValue] = useState('');
  const submit = () => {
    onSubmit(value);
    setValue('');
  };
  return (
    <View style={styles.dev}>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="개발용: 토큰 또는 QR URL"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.devInput}
        onSubmitEditing={submit}
      />
      <Pressable
        accessibilityRole="button"
        onPress={submit}
        style={styles.devButton}
      >
        <Text style={styles.devButtonLabel}>판정</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  overlay: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  close: { minHeight: 44, justifyContent: 'center' },
  closeLabel: { color: colors.text, fontSize: 17, fontWeight: '600' },
  titleBox: { flex: 1 },
  title: { color: colors.muted, fontSize: 14 },
  gate: { color: colors.text, fontSize: 20, fontWeight: '700' },
  counter: { color: colors.text, fontSize: 22, fontWeight: '700' },
  offline: {
    backgroundColor: colors.warning,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  offlineLabel: { color: '#111111', fontSize: 15, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 260,
    height: 260,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permission: { padding: space.lg, gap: space.md, alignSelf: 'stretch' },
  permissionText: { color: colors.text, fontSize: 17, lineHeight: 24 },
  dev: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  devInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: space.sm,
    fontSize: 14,
  },
  devButton: {
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: 10,
    backgroundColor: colors.text,
    justifyContent: 'center',
  },
  devButtonLabel: { color: colors.bg, fontWeight: '700' },
});
