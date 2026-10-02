import { useQuery } from '@tanstack/react-query';
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

  // 쿼리 결과가 아니라 따로 둔다 — 배정이 풀리면(403) 올리기와 명단 받기가
  // 같이 실패하는데, 결과로 넘기면 명단 실패에 묻혀 경고가 사라진다
  const [uploadProblem, setUploadProblem] = useState<string | null>(null);

  const sync = useQuery({
    queryKey: ['roster', dropId],
    queryFn: async ({ signal }) => {
      if (staffId) {
        const upload = await uploadQueue(auth.request, dropId, staffId, signal);
        setUploadProblem(upload.problem);
      }
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

  return {
    stats: snapshot.stats,
    drop: snapshot.drop,
    uploadProblem,
    refreshStats,
    sync,
  };
}

function readSnapshot(dropId: string, staffId: string | null) {
  return { stats: rosterStats(dropId, staffId), drop: getDrop(dropId) };
}
