import { CameraView, useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GateStatusBanner } from '@/components/gate-status-banner';
import { LastEntryBar } from '@/components/last-entry-bar';
import { Button } from '@/components/ui';
import { VerdictOverlay } from '@/components/verdict-overlay';
import { colors, space } from '@/constants/theme';
import { getGate } from '@/lib/roster';
import { useGateJudge } from '@/lib/use-gate-judge';
import { useRoster } from '@/lib/use-roster';

export default function ScanScreen() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gate] = useState(() => getGate(id));
  const [permission, requestPermission] = useCameraPermissions();
  const { stats, drop, uploadProblem, refreshStats, sync } = useRoster(id, {
    poll: true,
  });
  const judge = useGateJudge({
    dropId: id,
    gate,
    sync,
    onChange: refreshStats,
  });

  const scanning = permission?.granted && !judge.verdict && !judge.judging;

  // 입구를 고르지 않았거나(딥링크·정리된 행사) 행사 정보가 없으면 행사 홈으로
  if (!gate || !drop) return <Redirect href={`/drops/${id}`} />;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      {permission?.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={
            scanning ? ({ data }) => judge.handle(data) : undefined
          }
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
              {drop.title}
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

        <GateStatusBanner
          offline={judge.offline}
          pending={stats.pending}
          uploadProblem={uploadProblem}
        />

        <View style={styles.center} pointerEvents="box-none">
          {permission === null ? null : !permission.granted ? (
            <PermissionPrompt
              canAsk={permission.canAskAgain}
              onRequest={requestPermission}
            />
          ) : (
            <View style={styles.frame} pointerEvents="none">
              {judge.judging && (
                <ActivityIndicator color={colors.text} size="large" />
              )}
            </View>
          )}
        </View>

        <LastEntryBar
          lastEntry={judge.lastEntry}
          notice={judge.notice}
          onUndo={judge.undoLast}
        />
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/drops/${id}/search`)}
            style={({ pressed }) => [
              styles.search,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.searchLabel}>QR 없이 명단에서 찾기</Text>
          </Pressable>
        </View>
        {__DEV__ && <DevTokenInput onSubmit={judge.handle} />}
      </SafeAreaView>

      {judge.verdict && (
        <VerdictOverlay
          verdict={judge.verdict}
          onDismiss={judge.dismiss}
          onApprove={judge.approve}
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
  actions: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  search: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchLabel: { color: colors.text, fontSize: 17, fontWeight: '600' },
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
