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

// 색만으로는 적록색약 스태프가 초록과 빨강을 구분하기 어렵다 — 모양을 같이 쓴다
const ICON: Record<Verdict['color'], string> = {
  green: '✓',
  red: '✕',
  yellow: '!',
};

// 접근성 글자 크기를 키워도 큰 글자(판정 제목·이름)가 화면 밖으로 밀리지 않게
// 배율 상한을 둔다 — 줄이 모자라면 글자를 줄여 맞춘다
const MAX_SCALE = 1.2;

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
  const previous = 'previous' in verdict ? verdict.previous : undefined;

  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLabel={[verdict.title, name, previous, reason]
        .filter(Boolean)
        .join(', ')}
      // 노랑은 스태프가 판단해야 하므로 화면을 눌러 넘기지 않는다
      onPress={verdict.color === 'yellow' ? undefined : onDismiss}
      style={[StyleSheet.absoluteFill, { backgroundColor: bg }]}
    >
      <SafeAreaView style={styles.safe}>
        {verdict.offline && (
          <Text style={[styles.tag, text]} maxFontSizeMultiplier={MAX_SCALE}>
            기기 명단으로 판정
          </Text>
        )}
        <View style={styles.body}>
          <Text
            style={[styles.icon, text]}
            accessible={false}
            importantForAccessibility="no"
            maxFontSizeMultiplier={MAX_SCALE}
          >
            {ICON[verdict.color]}
          </Text>
          <Text
            style={[styles.title, text]}
            numberOfLines={2}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={MAX_SCALE}
          >
            {verdict.title}
          </Text>
          {name ? (
            <Text
              style={[styles.name, text]}
              numberOfLines={2}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={MAX_SCALE}
            >
              {name}
            </Text>
          ) : null}
          {previous ? (
            // 같은 QR이 방금 다른 입구로 들어갔는지 스태프가 바로 읽도록 크게
            <Text
              style={[styles.previous, text]}
              numberOfLines={2}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={MAX_SCALE}
            >
              {previous}
            </Text>
          ) : null}
          {tier ? (
            <Text
              style={[styles.tier, text]}
              numberOfLines={2}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={MAX_SCALE}
            >
              {tier}
            </Text>
          ) : null}
          {note ? (
            <Text
              style={[styles.note, text]}
              numberOfLines={2}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={MAX_SCALE}
            >
              {note}
            </Text>
          ) : null}
          {reason ? (
            <Text
              style={[styles.reason, text]}
              numberOfLines={4}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={MAX_SCALE}
            >
              {reason}
            </Text>
          ) : null}
        </View>
        {verdict.color === 'yellow' && verdict.pending ? (
          // 들여보내는 쪽은 되돌리기 어려운 결정이다 — 안전한 선택(들여보내지
          // 않음)을 채운 큰 버튼으로 위에 두고, 승인은 테두리 버튼으로 낮춘다
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onDismiss}
              style={[styles.action, styles.deny]}
            >
              <Text style={styles.denyLabel} maxFontSizeMultiplier={MAX_SCALE}>
                들여보내지 않음
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onApprove}
              style={[styles.action, styles.approve]}
            >
              <Text
                style={[styles.approveLabel, text]}
                maxFontSizeMultiplier={MAX_SCALE}
              >
                구매 확인됨 · 입장
              </Text>
            </Pressable>
          </View>
        ) : verdict.color === 'yellow' ? (
          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={[styles.action, styles.deny]}
          >
            <Text style={styles.denyLabel} maxFontSizeMultiplier={MAX_SCALE}>
              확인
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.hint, text]} maxFontSizeMultiplier={MAX_SCALE}>
            화면을 누르면 바로 다음 스캔
          </Text>
        )}
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: space.lg },
  tag: { fontSize: 16, fontWeight: '600', opacity: 0.85 },
  body: { flex: 1, justifyContent: 'center', gap: space.md },
  icon: { fontSize: 96, fontWeight: '800', lineHeight: 104 },
  title: { fontSize: 64, fontWeight: '800' },
  name: { fontSize: 40, fontWeight: '700' },
  previous: {
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    alignSelf: 'flex-start',
  },
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
  deny: { backgroundColor: '#111111' },
  denyLabel: { color: '#ffffff', fontSize: 19, fontWeight: '700' },
  approve: { borderWidth: 2, borderColor: '#111111' },
  approveLabel: { fontSize: 19, fontWeight: '700' },
});
