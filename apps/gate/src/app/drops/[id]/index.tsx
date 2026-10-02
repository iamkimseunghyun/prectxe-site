import { GATE_NAME_MAX } from '@prectxe/gate-contract';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, ErrorText, Field } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { formatEventTime } from '@/lib/format';
import { clearGate, clearRejected, getGate, setGate } from '@/lib/roster';
import { useRoster } from '@/lib/use-roster';

// 입구는 서버에 따로 등록하지 않는다 — 기록에 이름만 남는다
const GATE_PRESETS = ['A', 'B', 'C', 'D'];

const clock = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export default function DropHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gate, setGateState] = useState(() => getGate(id));
  const [customOpen, setCustomOpen] = useState(
    () => gate !== null && !GATE_PRESETS.includes(gate)
  );
  const [customGate, setCustomGate] = useState(() =>
    gate && !GATE_PRESETS.includes(gate) ? gate : ''
  );
  // 스캐너에서 돌아오면 useRoster가 그사이 입장한 수를 다시 읽는다
  const { stats, drop, uploadProblem, refreshStats, sync } = useRoster(id, {
    poll: false,
  });
  const syncError =
    sync.isError && !sync.isFetching ? sync.error.message : null;

  const chooseGate = useCallback(
    (value: string) => {
      const name = value.trim().slice(0, GATE_NAME_MAX);
      if (name) setGate(id, name);
      else clearGate(id);
      setGateState(name || null);
    },
    [id]
  );

  if (!drop)
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '' }} />
        <Text style={styles.body}>
          행사 정보를 찾을 수 없습니다. 목록에서 다시 들어와주세요.
        </Text>
      </View>
    );

  const meta = [formatEventTime(drop.eventDate), drop.venue]
    .filter(Boolean)
    .join(' · ');
  const canScan = gate !== null && stats.syncedAt !== null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: drop.title }} />
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {drop.allowReentry && <Text style={styles.badge}>재입장 허용 행사</Text>}

      <View style={styles.section}>
        <Text style={styles.heading}>입구</Text>
        <View style={styles.chips}>
          {GATE_PRESETS.map((preset) => (
            <Chip
              key={preset}
              label={preset}
              selected={gate === preset && !customOpen}
              onPress={() => {
                setCustomOpen(false);
                chooseGate(preset);
              }}
            />
          ))}
          <Chip
            label="직접 입력"
            selected={customOpen}
            onPress={() => {
              setCustomOpen(true);
              // 이전에 고른 A~D가 남으면 화면은 직접 입력인데 기록은 A로 쌓인다
              chooseGate(customGate);
            }}
          />
        </View>
        {customOpen && (
          <Field
            label="입구 이름"
            value={customGate}
            onChangeText={setCustomGate}
            onEndEditing={() => chooseGate(customGate)}
            onSubmitEditing={() => chooseGate(customGate)}
            maxLength={GATE_NAME_MAX}
            placeholder="예: 정문, 2층"
            returnKeyType="done"
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>명단</Text>
        <Text style={styles.count}>
          입장 {stats.entered} / 발권 {stats.total}
        </Text>
        <Text style={styles.meta}>
          {sync.isFetching
            ? '명단을 받는 중…'
            : stats.syncedAt
              ? `마지막 동기화 ${clock.format(new Date(stats.syncedAt))}`
              : '아직 명단을 받지 못했습니다'}
        </Text>
        {syncError && (
          <ErrorText>
            {stats.syncedAt
              ? `명단을 새로 받지 못했습니다(${syncError}). 이전에 받은 명단으로 판정합니다.`
              : syncError}
          </ErrorText>
        )}
        {stats.pending > 0 &&
          (uploadProblem ? (
            // 배정 해제(403)면 명단 받기도 같은 사유로 실패한다 — 사유는 한 번만
            <ErrorText>
              {`서버에 올리지 못한 입장 기록 ${stats.pending}건${uploadProblem === syncError ? '' : ` · ${uploadProblem}`}`}
            </ErrorText>
          ) : (
            <Text style={styles.pending}>
              서버에 아직 올리지 않은 입장 기록 {stats.pending}건 — 연결되면
              자동으로 올라갑니다
            </Text>
          ))}
        {stats.rejected && (
          <View style={styles.rejected}>
            <ErrorText>
              {`서버가 받지 않은 입장 기록 ${stats.rejected.count}건 · ${stats.rejected.reason} 이미 들여보낸 관객이라면(명단 밖 수동 입장 등) 주최자에게 알려주세요.`}
            </ErrorText>
            <Button
              label="확인했습니다"
              variant="ghost"
              onPress={() => {
                clearRejected(id);
                refreshStats();
              }}
            />
          </View>
        )}
        {stats.pendingOthers > 0 && (
          <Text style={styles.meta}>
            이 기기에 다른 스태프의 기록 {stats.pendingOthers}건이 남아
            있습니다. 그 스태프가 이 기기로 다시 로그인하면 올라갑니다.
          </Text>
        )}
        <Button
          label="명단 새로고침"
          variant="ghost"
          onPress={() => sync.refetch()}
          loading={sync.isFetching}
        />
      </View>

      <Button
        label="스캔 시작"
        onPress={() => router.push(`/drops/${id}/scan`)}
        disabled={!canScan}
      />
      <Button
        label="명단에서 찾아 입장 처리"
        variant="ghost"
        onPress={() => router.push(`/drops/${id}/search`)}
        disabled={!canScan}
      />
      {!canScan && (
        <Text style={styles.meta}>
          입구를 고르고 명단을 받으면 시작할 수 있어요.
        </Text>
      )}
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: space.lg, gap: space.lg },
  body: { color: colors.text, fontSize: 16, lineHeight: 22 },
  meta: { color: colors.muted, fontSize: 15 },
  badge: { color: colors.warning, fontSize: 14, fontWeight: '600' },
  section: { gap: space.sm },
  heading: { color: colors.text, fontSize: 20, fontWeight: '700' },
  count: { color: colors.text, fontSize: 28, fontWeight: '700' },
  pending: { color: colors.warning, fontSize: 15 },
  rejected: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minWidth: 56,
    minHeight: 48,
    paddingHorizontal: space.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.text, borderColor: colors.text },
  chipLabel: { color: colors.text, fontSize: 18, fontWeight: '600' },
  chipLabelSelected: { color: colors.bg },
});
