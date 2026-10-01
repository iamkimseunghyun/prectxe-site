import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { space } from '@/constants/theme';
import type { Verdict } from '@/lib/judge';

// 어두운 공연장·밝은 야외 모두에서 읽히게 화면 전체를 색으로 채운다 (PRD 6장)
const FILL: Record<Verdict['color'], { bg: string; fg: string }> = {
  green: { bg: '#15803d', fg: '#ffffff' },
  red: { bg: '#b91c1c', fg: '#ffffff' },
  yellow: { bg: '#facc15', fg: '#111111' },
};

export function VerdictOverlay({
  verdict,
  onDismiss,
  onApprove,
}: {
  verdict: Verdict;
  onDismiss: () => void;
  onApprove: () => void;
}) {
  const { bg, fg } = FILL[verdict.color];
  const text = { color: fg };
  const name = 'name' in verdict ? verdict.name : undefined;
  const tier = 'tier' in verdict ? verdict.tier : undefined;
  const note = 'note' in verdict ? verdict.note : undefined;
  const reason = 'reason' in verdict ? verdict.reason : undefined;

  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLabel={[verdict.title, name, reason]
        .filter(Boolean)
        .join(', ')}
      // 노랑은 스태프가 판단해야 하므로 화면을 눌러 넘기지 않는다
      onPress={verdict.color === 'yellow' ? undefined : onDismiss}
      style={[StyleSheet.absoluteFill, { backgroundColor: bg }]}
    >
      <SafeAreaView style={styles.safe}>
        {verdict.offline && (
          <Text style={[styles.tag, text]}>기기 명단으로 판정</Text>
        )}
        <View style={styles.body}>
          <Text style={[styles.title, text]}>{verdict.title}</Text>
          {name ? (
            <Text style={[styles.name, text]} numberOfLines={2}>
              {name}
            </Text>
          ) : null}
          {tier ? <Text style={[styles.tier, text]}>{tier}</Text> : null}
          {note ? <Text style={[styles.note, text]}>{note}</Text> : null}
          {reason ? <Text style={[styles.reason, text]}>{reason}</Text> : null}
        </View>
        {verdict.color === 'yellow' ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onApprove}
              style={[styles.action, styles.approve]}
            >
              <Text style={styles.approveLabel}>구매 확인됨 · 입장</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onDismiss}
              style={[styles.action, styles.deny]}
            >
              <Text style={[styles.denyLabel, text]}>들여보내지 않음</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.hint, text]}>화면을 누르면 바로 다음 스캔</Text>
        )}
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: space.lg },
  tag: { fontSize: 16, fontWeight: '600', opacity: 0.85 },
  body: { flex: 1, justifyContent: 'center', gap: space.md },
  title: { fontSize: 64, fontWeight: '800' },
  name: { fontSize: 40, fontWeight: '700' },
  tier: { fontSize: 26, fontWeight: '600' },
  note: { fontSize: 20, opacity: 0.9 },
  reason: { fontSize: 22, lineHeight: 30 },
  hint: { fontSize: 15, opacity: 0.75, textAlign: 'center' },
  actions: { gap: space.md },
  action: {
    minHeight: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approve: { backgroundColor: '#111111' },
  approveLabel: { color: '#ffffff', fontSize: 19, fontWeight: '700' },
  deny: { borderWidth: 2, borderColor: '#111111' },
  denyLabel: { fontSize: 19, fontWeight: '700' },
});
