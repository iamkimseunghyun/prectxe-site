import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './auth';
import { getDrop, rosterStats, syncRoster, uploadQueue } from './roster';

/** 스캔 중에 다른 입구의 입장을 받아오는 간격 (PRD 6장: 몇 초 간격) */
const ROSTER_POLL_MS = 15_000;

/**
 * 기기와 서버를 맞춘다 — 쌓인 내 기록을 먼저 올리고(`/sync`), 명단을 받는다.
 * 올리는 게 먼저인 이유: 방금 취소한 입장이 서버에 아직 '입장'으로 남아 있으면
 * 명단을 받는 순간 기기도 다시 '입장'이 된다.
 *
 * 명단은 판정에 쓰지 않지만(온라인이면 서버가 판정), 오프라인으로 바뀌는 순간
 * 기기 명단이 최대한 최신이어야 한다.
 */
export function useRoster(dropId: string, { poll }: { poll: boolean }) {
  const auth = useAuth();
  const staffId = auth.status === 'signedIn' ? auth.staff.id : null;
  // 행사 정보(재입장 허용 등)도 명단 동기화 때 바뀌므로 집계와 같이 다시 읽는다
  const [snapshot, setSnapshot] = useState(() => readSnapshot(dropId, staffId));
  const refreshStats = useCallback(
    () => setSnapshot(readSnapshot(dropId, staffId)),
    [dropId, staffId]
  );

  // 스캔 위에 검색을 띄우면 두 화면이 다 마운트돼 있다 — 보이는 화면만
  // 폴링해야 요청이 두 배가 되지 않는다
  const focused = useIsFocused();

  const sync = useQuery({
    queryKey: ['roster', dropId],
    queryFn: async ({ signal }) => {
      // 결과(막힌 사유·거절 건수)는 기기 DB에 남는다 — 쿼리 결과로 넘기면
      // 배정 해제(403)처럼 명단 받기까지 실패할 때 같이 버려지고, 이 쿼리를
      // 같이 쓰는 다른 화면에는 전해지지 않는다
      if (staffId) await uploadQueue(auth.request, dropId, staffId, signal);
      await syncRoster(auth.request, dropId, signal);
      return Date.now();
    },
    refetchInterval: poll && focused ? ROSTER_POLL_MS : false,
    retry: false,
  });

  // 동기화가 끝날 때마다(성공·실패 모두), 그리고 화면으로 돌아올 때(다른
  // 화면에서 입장·취소했을 수 있다) 기기 집계를 다시 읽는다
  useEffect(() => {
    if (sync.dataUpdatedAt || sync.errorUpdatedAt) refreshStats();
  }, [sync.dataUpdatedAt, sync.errorUpdatedAt, refreshStats]);
  useEffect(() => {
    if (focused) refreshStats();
  }, [focused, refreshStats]);

  return {
    stats: snapshot.stats,
    drop: snapshot.drop,
    uploadProblem: snapshot.stats.uploadProblem,
    refreshStats,
    sync,
  };
}

function readSnapshot(dropId: string, staffId: string | null) {
  return { stats: rosterStats(dropId, staffId), drop: getDrop(dropId) };
}
