import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ORDERS } from '@/lib/constants/constants';
import { formatKstDateTime } from '@/lib/utils';
import type {
  CheckInLog,
  CheckInLogEntry,
} from '@/modules/tickets/server/queries';

const FLAG_LABEL = {
  duplicate: '중복 입장',
  cancelled_ticket: '취소된 티켓',
} as const;

function actorLabel(entry: CheckInLogEntry): string {
  if (entry.staff) return entry.staff.name ?? entry.staff.email;
  if (entry.userId) return '어드민 (웹)';
  return '-';
}

function LogTable({ entries }: { entries: CheckInLogEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>스캔 시각</TableHead>
            <TableHead>구분</TableHead>
            <TableHead>관객</TableHead>
            <TableHead>권종</TableHead>
            <TableHead>입구</TableHead>
            <TableHead>처리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap tabular-nums">
                {formatKstDateTime(entry.scannedAt)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {entry.kind === 'entry' ? '입장' : '입장 취소'}
                {entry.flag && (
                  <Badge
                    variant={entry.voided ? 'outline' : 'destructive'}
                    className="ml-2"
                  >
                    {FLAG_LABEL[entry.flag]}
                    {entry.voided && ' · 취소됨'}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {entry.ticket.order.buyerName}
                <span className="ml-1 text-xs text-muted-foreground">
                  {entry.ticket.order.orderNo}
                </span>
              </TableCell>
              <TableCell>
                {entry.ticket.ticketTier?.name ??
                  (entry.ticket.order.isGuest ? ORDERS.GUEST_TIER_LABEL : '-')}
              </TableCell>
              <TableCell>{entry.gate ?? '-'}</TableCell>
              <TableCell>{actorLabel(entry)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CheckInLogView({
  drop,
  log,
}: {
  drop: { id: string; title: string };
  log: CheckInLog;
}) {
  const { entries, truncated, flagged, counts } = log;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/drops/${drop.id}`} aria-label="드랍으로 돌아가기">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">입장 기록</h1>
          <p className="text-sm text-muted-foreground">{drop.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">입장 처리</p>
            <p className="text-2xl font-semibold tabular-nums">
              {counts.entry}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">입장 취소</p>
            <p className="text-2xl font-semibold tabular-nums">{counts.undo}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">확인 필요</p>
            <p className="text-2xl font-semibold tabular-nums">
              {counts.needsReview}
            </p>
          </CardContent>
        </Card>
      </div>

      {flagged.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">확인이 필요한 입장</h2>
          <p className="text-sm text-muted-foreground">
            오프라인 상태에서 들여보낸 뒤 동기화해 보니 이미 입장한 티켓이었거나
            취소된 티켓이었던 경우입니다. 이미 입장한 뒤라 되돌릴 수는 없고,
            같은 티켓의 다른 기록과 시각·입구를 비교해 확인하세요. 스태프가
            앱에서 취소한 입장은 &apos;취소됨&apos;으로 표시되고 확인 필요
            수에서 빠집니다.
          </p>
          <Card>
            <CardContent className="p-0">
              <LogTable entries={flagged} />
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-base font-semibold">전체 기록</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 기록이 없습니다.</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <LogTable entries={entries} />
            </CardContent>
          </Card>
        )}
        {truncated && (
          <p className="text-xs text-muted-foreground">
            전체 기록 표는 최근 기록만 표시합니다. 위 집계와 확인 필요 목록은
            전체 기준입니다.
          </p>
        )}
      </section>
    </div>
  );
}
