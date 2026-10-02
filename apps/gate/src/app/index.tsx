import type { GateDrop } from '@prectxe/gate-contract';
import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ErrorText } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { formatEventTime } from '@/lib/format';
import { loadDrops, pendingForStaff, strandedForStaff } from '@/lib/roster';

export default function DropsScreen() {
  const auth = useAuth();
  const staffId = auth.status === 'signedIn' ? auth.staff.id : null;
  const drops = useQuery({
    queryKey: ['drops'],
    queryFn: async ({ signal }) => {
      const result = await loadDrops(auth.request, signal);
      // 기록이 갈 곳을 잃는 건 행사가 목록에서 빠질 때뿐이라 목록과 같이 센다
      const stranded = staffId
        ? strandedForStaff(
            staffId,
            result.drops.map((drop) => drop.id)
          )
        : 0;
      return { ...result, stranded };
    },
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                confirmSignOut(
                  auth.signOut,
                  auth.status === 'signedIn'
                    ? pendingForStaff(auth.staff.id)
                    : 0
                )
              }
              hitSlop={12}
            >
              <Text style={styles.headerAction}>로그아웃</Text>
            </Pressable>
          ),
        }}
      />
      {auth.status === 'signedIn' && (
        <Text style={styles.staff}>{auth.staff.name ?? auth.staff.email}</Text>
      )}
      {drops.data?.offline && (
        <Text style={styles.offline}>
          오프라인 · 마지막으로 받은 목록입니다
        </Text>
      )}
      {!!drops.data?.stranded && (
        <Text accessibilityRole="alert" style={styles.stranded}>
          올리지 못한 입장 기록 {drops.data.stranded}건이 이 기기에 있습니다.
          목록에서 빠진 행사(배정 해제·종료)의 기록이라 저절로 올라가지
          않습니다. 주최자에게 다시 배정을 요청하세요.
        </Text>
      )}
      <FlatList
        data={drops.data?.drops ?? []}
        keyExtractor={(drop) => drop.id}
        renderItem={({ item }) => <DropRow drop={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={drops.isRefetching}
            onRefresh={drops.refetch}
            tintColor={colors.text}
          />
        }
        ListEmptyComponent={
          drops.isPending ? null : drops.isError ? (
            <ErrorText>{drops.error.message}</ErrorText>
          ) : (
            <Text style={styles.empty}>
              지금 입장을 처리할 행사가 없습니다. 행사 하루 전부터 목록에
              나타납니다. 배정이 안 됐다면 주최자에게 확인해주세요.
            </Text>
          )
        }
      />
    </View>
  );
}

// 다시 들어오려면 메일로 코드를 받아야 해서, 인터넷이 안 되는 입구에서 잘못
// 누르면 그 자리에서 입장 처리를 못 한다
function confirmSignOut(signOut: () => Promise<void>, pending: number) {
  Alert.alert(
    '로그아웃할까요?',
    [
      '다시 로그인하려면 이메일로 코드를 받아야 합니다. 인터넷이 안 되는 곳에서는 다시 들어올 수 없습니다.',
      // 큐는 로그아웃해도 남지만, 다른 사람이 이 기기로 로그인하면 올라가지 않는다
      pending > 0 &&
        `아직 서버에 올리지 않은 입장 기록이 ${pending}건 있습니다. 기기에 남아 있다가 이 계정으로 다시 로그인하면 올라갑니다.`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]
  );
}

function DropRow({ drop }: { drop: GateDrop }) {
  const when = formatEventTime(drop.eventDate);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/drops/${drop.id}`)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.rowTitle}>{drop.title}</Text>
      {(when || drop.venue) && (
        <Text style={styles.rowMeta}>
          {[when, drop.venue].filter(Boolean).join(' · ')}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  staff: {
    color: colors.muted,
    fontSize: 14,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  list: { padding: space.lg, gap: space.md },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: space.lg,
    gap: space.xs,
  },
  rowTitle: { color: colors.text, fontSize: 20, fontWeight: '600' },
  rowMeta: { color: colors.muted, fontSize: 15 },
  empty: { color: colors.muted, fontSize: 16, lineHeight: 22 },
  headerAction: { color: colors.muted, fontSize: 16 },
  offline: {
    color: colors.warning,
    fontSize: 14,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  stranded: {
    color: colors.danger,
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
});
