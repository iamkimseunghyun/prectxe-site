'use client';

import { ArrowLeft, History, UserPlus, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ORDERS } from '@/lib/constants/constants';
import { formatKstTime } from '@/lib/utils';
import { getAttendeeRoster } from '@/modules/tickets/server/actions';
import type { RosterEntry } from '@/modules/tickets/server/queries';

/** 다른 입구의 입장을 반영하는 간격 — 입장 현황 숫자(`useCheckInStats`)와 같다 */
const ROSTER_POLL_MS = 10_000;

type Filter = 'all' | 'waiting' | 'entered';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'waiting', label: '미입장' },
  { value: 'entered', label: '입장' },
];

/**
 * 명단을 주기적으로 다시 읽는다. 탭이 가려지면 멈추고 다시 보이면 바로 읽는다.
 * 읽기에 실패하면 `failed`가 켜진다 — 낡은 명단을 최신으로 믿고 입장 여부를
 * 판단하지 않도록 화면이 알려야 한다.
 */
function useAttendeeRoster(
  dropId: string,
  initial: RosterEntry[],
  initialAt: Date
) {
  const [roster, setRoster] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState(initialAt);
  const [failed, setFailed] = useState(false);
  // 폴링·화면 복귀 요청이 겹쳐도 마지막으로 보낸 요청의 응답만 반영한다
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++latest.current;
    try {
      const r = await getAttendeeRoster(dropId);
      if (seq !== latest.current) return;
      if (!r.success) {
        setFailed(true);
        return;
      }
      setRoster(r.data);
      setUpdatedAt(new Date());
      setFailed(false);
    } catch {
      if (seq === latest.current) setFailed(true);
    }
  }, [dropId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, ROSTER_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { roster, updatedAt, failed };
}

const byName = (a: RosterEntry, b: RosterEntry) =>
  a.buyerName.localeCompare(b.buyerName, 'ko') ||
  a.orderNo.localeCompare(b.orderNo);

const byRecentEntry = (a: RosterEntry, b: RosterEntry) =>
  new Date(b.checkedInAt ?? 0).getTime() -
  new Date(a.checkedInAt ?? 0).getTime();

export function AttendeeRosterView({
  drop,
  initialRoster,
  loadedAt,
}: {
  drop: { id: string; title: string };
  initialRoster: RosterEntry[];
  loadedAt: Date;
}) {
  const { roster, updatedAt, failed } = useAttendeeRoster(
    drop.id,
    initialRoster,
    loadedAt
  );
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const total = roster.length;
  const entered = useMemo(
    () => roster.filter((r) => r.entered).length,
    [roster]
  );
  const rate = total > 0 ? Math.round((entered / total) * 100) : 0;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = roster.filter((r) => {
      if (filter === 'waiting' && r.entered) return false;
      if (filter === 'entered' && !r.entered) return false;
      if (!q) return true;
      return [r.buyerName, r.orderNo, r.note ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
    // 입장 탭은 방금 들어온 사람이 위로, 나머지는 이름순
    return matched.sort(filter === 'entered' ? byRecentEntry : byName);
  }, [roster, filter, query]);

  const countOf = (f: Filter) =>
    f === 'all' ? total : f === 'entered' ? entered : total - entered;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link
              href={`/admin/drops/${drop.id}`}
              aria-label="드랍으로 돌아가기"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">입장 현황</h1>
            <p className="text-sm text-muted-foreground">{drop.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/drops/${drop.id}/check-ins`}>
              <History className="mr-1 h-4 w-4" />
              입장 기록
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/drops/${drop.id}/guests`}>
              <UserPlus className="mr-1 h-4 w-4" />
              게스트
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-1 p-4">
          <p className="text-xs text-muted-foreground">입장 / 발권</p>
          <p className="text-3xl font-semibold tabular-nums" aria-live="polite">
            {entered} / {total}
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {rate}%
            </span>
          </p>
          <p
            className={`flex items-center gap-1 text-xs ${
              failed ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {failed && <WifiOff className="h-3.5 w-3.5" />}
            {failed
              ? `갱신 실패 — ${formatKstTime(updatedAt)} 기준 명단입니다. 다른 입구의 입장이 빠져 있을 수 있습니다`
              : `${formatKstTime(updatedAt)} 기준 · 10초마다 자동 갱신`}
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <search>
          <Label htmlFor="roster-search" className="sr-only">
            명단 검색
          </Label>
          <Input
            id="roster-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·주문번호·메모로 검색"
          />
        </search>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? 'default' : 'outline'}
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              <span className="ml-1 tabular-nums">{countOf(f.value)}</span>
            </Button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {rows.length}명 표시 중
        </p>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {total === 0
              ? '아직 발권된 티켓이 없습니다.'
              : '해당하는 사람이 없습니다.'}
          </p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>권종</TableHead>
                      <TableHead>주문번호</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>입장 시각</TableHead>
                      <TableHead>입구</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {r.buyerName}
                          {r.note && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {r.note}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.tierName ??
                            (r.isGuest ? ORDERS.GUEST_TIER_LABEL : '-')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.orderNo}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.entered ? 'default' : 'outline'}>
                            {r.entered ? '입장' : '미입장'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {r.checkedInAt ? formatKstTime(r.checkedInAt) : '-'}
                        </TableCell>
                        <TableCell>{r.gate ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
