import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space } from '@/constants/theme';
import type { LastEntry } from '@/lib/use-gate-judge';

/**
 * 직전 입장과 취소 버튼 (PRD FR-5: 잘못 스캔한 입장은 취소할 수 있다). 취소는
 * 기록을 지우지 않고 '취소' 기록을 하나 더 남긴다.
 */
export function LastEntryBar({
  lastEntry,
  notice,
  onUndo,
}: {
  lastEntry: LastEntry | null;
  notice: string | null;
  onUndo: () => void;
}) {
  if (notice)
    return (
      <View style={styles.bar} accessibilityLiveRegion="polite">
        <Text style={styles.notice}>{notice}</Text>
      </View>
    );
  if (!lastEntry) return null;

  const confirm = () =>
    Alert.alert(
      `${lastEntry.name} 입장을 취소할까요?`,
      lastEntry.reentry
        ? '이번 재입장 기록만 취소됩니다. 처음 입장은 그대로입니다.'
        : '잘못 스캔했을 때만 취소하세요. 취소한 기록도 남습니다.',
      [
        { text: '닫기', style: 'cancel' },
        { text: '입장 취소', style: 'destructive', onPress: onUndo },
      ]
    );

  return (
    <View style={styles.bar}>
      <View style={styles.info}>
        <Text style={styles.label}>
          직전 {lastEntry.reentry ? '재입장' : '입장'}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {lastEntry.name}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${lastEntry.name} 입장 취소`}
        onPress={confirm}
        style={({ pressed }) => [styles.undo, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.undoLabel}>입장 취소</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: 'rgba(0,0,0,0.75)',
    minHeight: 60,
  },
  info: { flex: 1 },
  label: { color: colors.muted, fontSize: 13 },
  name: { color: colors.text, fontSize: 17, fontWeight: '600' },
  notice: { color: colors.text, fontSize: 16, flex: 1 },
  undo: {
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    justifyContent: 'center',
  },
  undoLabel: { color: colors.danger, fontSize: 16, fontWeight: '700' },
});
