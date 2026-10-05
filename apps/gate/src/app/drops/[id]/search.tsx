import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GateStatusBanner } from '@/components/gate-status-banner';
import { LastEntryBar } from '@/components/last-entry-bar';
import { VerdictOverlay } from '@/components/verdict-overlay';
import { colors, space } from '@/constants/theme';
import { formatClock } from '@/lib/format';
import { getGate, type RosterRow, searchRoster } from '@/lib/roster';
import { useGateJudge } from '@/lib/use-gate-judge';
import { useRoster } from '@/lib/use-roster';

/**
 * QR 없이 명단에서 찾아 입장 처리 (PRD FR-4) — 휴대폰을 못 꺼내는 관객, 깨진
 * QR, QR이 없는 게스트. 입장 처리는 스캔과 똑같은 판정·기록을 거친다.
 */
export default function SearchScreen() {
  // 렌더 중에 기기 DB(SQLite)를 읽는다. React Compiler는 searchRoster를 순수
  // 함수로 보고 (id, query)가 같으면 캐시된 결과를 돌려주는데, 입장·취소·명단
  // 동기화로 DB가 바뀌어도 인수는 그대로라 목록이 낡는다
  'use no memo';
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gate] = useState(() => getGate(id));
  const [query, setQuery] = useState('');
  // 검색 화면에 오래 머물러도 쌓인 기록이 올라가고 다른 입구 입장이 보이게 폴링
  const { stats, drop, uploadProblem, refreshStats, sync } = useRoster(id, {
    poll: true,
  });
  // refreshStats가 상태를 바꿔 다시 그리면 아래 검색도 다시 읽힌다
  const judge = useGateJudge({
    dropId: id,
    gate,
    sync,
    onChange: refreshStats,
  });
  const rows = searchRoster(id, query);

  if (!gate || !drop) return <Redirect href={`/drops/${id}`} />;

  const enter = (row: RosterRow) => {
    // 키보드가 떠 있으면 판정 뒤 화면 아래 '입장 취소' 막대를 가린다
    Keyboard.dismiss();
    Alert.alert(
      `${row.buyerName} 입장 처리할까요?`,
      // 목록에서 같은 이름을 뒷자리로 구분해 골랐으니 확인창에도 같이 보여준다
      [row.tierName, row.note, row.phoneLast4 && `··${row.phoneLast4}`]
        .filter(Boolean)
        .join(' · ') || '본인 확인 후 처리하세요.',
      [
        { text: '닫기', style: 'cancel' },
        {
          text: '입장 처리',
          onPress: () => judge.handle(row.token, { manual: true }),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <Stack.Screen options={{ title: `명단 검색 · ${gate} 입구` }} />
      <GateStatusBanner
        offline={judge.offline}
        pending={stats.pending}
        uploadProblem={uploadProblem}
      />
      <View style={styles.searchBox} accessibilityRole="search">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="이름 · 전화번호 뒷자리 4자리 · 메모"
          placeholderTextColor={colors.muted}
          autoFocus
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          accessibilityLabel="명단 검색"
          style={styles.input}
        />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row) => row.token}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <RosterItem row={item} onEnter={() => enter(item)} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty} accessibilityLiveRegion="polite">
            {query.trim()
              ? '찾는 관객이 없습니다. 이름을 다르게 입력하거나 행사 화면에서 명단을 새로고침해보세요.'
              : '이름이나 전화번호 뒷자리 4자리로 찾아요. 게스트는 메모(누구의 게스트인지)로도 찾을 수 있어요.'}
          </Text>
        }
      />

      <LastEntryBar
        lastEntry={judge.lastEntry}
        notice={judge.notice}
        onUndo={judge.requestUndo}
      />

      {judge.verdict && (
        <VerdictOverlay
          verdict={judge.verdict}
          onDismiss={judge.dismiss}
          onApprove={judge.approve}
        />
      )}
    </SafeAreaView>
  );
}

function RosterItem({ row, onEnter }: { row: RosterRow; onEnter: () => void }) {
  const status =
    row.status === 'cancelled'
      ? '취소'
      : row.status === 'checked_in'
        ? `입장 ${row.checkedInAt ? formatClock(row.checkedInAt) : ''}`
        : '미입장';
  const meta = [row.tierName, row.note, row.phoneLast4 && `··${row.phoneLast4}`]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.buyerName}, ${status}`}
      accessibilityHint="입장 처리"
      disabled={row.status === 'cancelled'}
      onPress={onEnter}
      style={({ pressed }) => [
        styles.row,
        row.status === 'cancelled' && { opacity: 0.5 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {row.buyerName}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.status,
          row.status === 'checked_in' && { color: colors.success },
          row.status === 'cancelled' && { color: colors.danger },
        ]}
      >
        {status}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  searchBox: { padding: space.md },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 18,
    paddingHorizontal: space.md,
  },
  list: { paddingHorizontal: space.md, paddingBottom: space.lg, gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  rowText: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 18, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 14 },
  status: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  empty: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    padding: space.md,
  },
});
