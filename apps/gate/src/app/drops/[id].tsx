import type { GateDropsResponse } from '@prectxe/gate-contract';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, space } from '@/constants/theme';
import { formatEventTime } from '@/lib/format';

// 입구 선택·명단 다운로드·스캐너는 다음 단계에서 이 화면에 붙는다
export default function DropScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // 목록 화면이 받아둔 캐시에서 꺼낸다 (select 전 원본이 저장돼 있다)
  const drop = useQueryClient()
    .getQueryData<GateDropsResponse>(['drops'])
    ?.drops.find((d) => d.id === id);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: drop?.title ?? '' }} />
      {drop && (
        <Text style={styles.meta}>
          {[formatEventTime(drop.eventDate), drop.venue]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      )}
      <Text style={styles.note}>스캐너는 다음 업데이트에서 추가됩니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: space.lg,
    gap: space.md,
  },
  meta: { color: colors.muted, fontSize: 16 },
  note: { color: colors.text, fontSize: 18 },
});
