'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatKstTime } from '@/lib/utils';
import { getCheckInStats } from '@/modules/tickets/server/actions';

/** 다른 입구(게이트 앱·다른 스캐너)의 입장을 반영하는 간격 (PRD FR-7: 몇 초 간격) */
const STATS_POLL_MS = 10_000;

export type CheckInStats = { total: number; checkedIn: number };

/**
 * 드랍의 "입장 N / 발권 M"을 주기적으로 다시 읽는다. 탭이 가려져 있으면 멈추고,
 * 다시 보이면 바로 한 번 읽는다 — 띄워만 둔 탭이 계속 요청하지 않게.
 */
export function useCheckInStats(dropId: string) {
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // 폴링·화면 복귀·스캔 직후 요청이 겹칠 수 있다 — 늦게 도착한 옛 응답이 새
  // 숫자를 덮지 않게 마지막으로 보낸 요청의 응답만 반영한다
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++latest.current;
    try {
      const r = await getCheckInStats(dropId);
      if (seq !== latest.current || !r.success) return;
      setStats(r.data);
      setUpdatedAt(new Date());
    } catch {
      // 네트워크 오류 — 다음 주기에 다시 읽는다(갱신 시각이 멈춰 있어 보인다)
    }
  }, [dropId]);

  useEffect(() => {
    // 다른 드랍으로 바뀌면 이전 드랍의 숫자를 지운다
    setStats(null);
    setUpdatedAt(null);
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, STATS_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { stats, updatedAt, refresh };
}

/** 주최자용 실시간 입장 현황 (PRD FR-7) */
export function LiveCheckInStats({ dropId }: { dropId: string }) {
  const { stats, updatedAt } = useCheckInStats(dropId);
  const rate =
    stats && stats.total > 0
      ? Math.round((stats.checkedIn / stats.total) * 100)
      : null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end justify-between gap-2 p-4">
        <div>
          <p className="text-xs text-muted-foreground">현재 입장</p>
          <p className="text-3xl font-semibold tabular-nums" aria-live="polite">
            {stats ? (
              <>
                {stats.checkedIn}
                <span className="text-lg text-muted-foreground">
                  {' '}
                  / 발권 {stats.total}
                  {rate !== null && ` · ${rate}%`}
                </span>
              </>
            ) : (
              '—'
            )}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {updatedAt
            ? `${STATS_POLL_MS / 1000}초마다 갱신 · ${formatKstTime(updatedAt)}`
            : '불러오는 중…'}
        </p>
      </CardContent>
    </Card>
  );
}
