import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './auth';
import { rosterStats, syncRoster } from './roster';

/** 스캔 중에 다른 입구의 입장을 받아오는 간격 (PRD 6장: 몇 초 간격) */
const ROSTER_POLL_MS = 15_000;

/**
 * 기기 명단을 서버와 맞추고 집계를 보여준다. 판정에는 쓰지 않지만(온라인이면
 * 서버가 판정), 오프라인으로 바뀌는 순간 기기 명단이 최대한 최신이어야 한다.
 */
export function useRoster(dropId: string, { poll }: { poll: boolean }) {
  const auth = useAuth();
  const [stats, setStats] = useState(() => rosterStats(dropId));
  const refreshStats = useCallback(
    () => setStats(rosterStats(dropId)),
    [dropId]
  );

  const sync = useQuery({
    queryKey: ['roster', dropId],
    queryFn: async ({ signal }) => {
      await syncRoster(auth.request, dropId, signal);
      return Date.now();
    },
    refetchInterval: poll ? ROSTER_POLL_MS : false,
    retry: false,
  });

  // 동기화가 끝날 때마다(성공·실패 모두) 기기 집계를 다시 읽는다
  useEffect(() => {
    if (sync.dataUpdatedAt || sync.errorUpdatedAt) refreshStats();
  }, [sync.dataUpdatedAt, sync.errorUpdatedAt, refreshStats]);

  return { stats, refreshStats, sync };
}
