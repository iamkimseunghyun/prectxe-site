import { StyleSheet, Text, View } from 'react-native';
import { colors, space } from '@/constants/theme';

/**
 * 스캔·명단 검색 상단의 경고 띠 — 기기 명단으로 판정 중이거나, 쌓인 내 기록을
 * 서버가 받아주지 않을 때(배정 해제 등). 기록은 지우지 않고 남겨 둔다.
 */
export function GateStatusBanner({
  offline,
  pending,
  uploadProblem,
}: {
  offline: boolean;
  /** 아직 올리지 못한 내 기록 수 */
  pending: number;
  uploadProblem: string | null;
}) {
  const message = offline
    ? `오프라인 · 기기 명단으로 판정 중${pending > 0 ? ` · 올릴 기록 ${pending}건` : ''}`
    : uploadProblem && pending > 0
      ? `기록 ${pending}건을 올리지 못했습니다 · ${uploadProblem}`
      : null;
  if (!message) return null;

  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <Text style={styles.label}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  label: { color: '#111111', fontSize: 15, fontWeight: '700' },
});
