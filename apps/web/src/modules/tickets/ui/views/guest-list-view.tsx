'use client';

import { ArrowLeft, Link2, Loader2, Trash2, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ORDERS } from '@/lib/constants/constants';
import { getOrderTicketsUrl } from '@/lib/utils/ticket-url';
import {
  cancelOrder,
  checkInTicket,
  undoCheckIn,
} from '@/modules/tickets/server/actions';
import { addGuest } from '@/modules/tickets/server/guest-actions';
import type { DropGuest } from '@/modules/tickets/server/queries';

export function GuestListView({
  drop,
  guests,
}: {
  drop: { id: string; title: string };
  guests: DropGuest[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [removeTarget, setRemoveTarget] = useState<DropGuest | null>(null);

  const totalPeople = guests.reduce((n, g) => n + g.tickets.length, 0);
  const enteredPeople = guests.reduce(
    (n, g) => n + g.tickets.filter((t) => t.status === 'checked_in').length,
    0
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) =>
      [g.buyerName, g.buyerPhone, g.note ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [guests, query]);

  const run = (action: () => Promise<void>) =>
    startTransition(async () => {
      await action();
      router.refresh();
    });

  const onAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    run(async () => {
      const result = await addGuest(drop.id, {
        name: String(fd.get('name') ?? ''),
        count: Number(fd.get('count') ?? 1),
        phone: String(fd.get('phone') ?? ''),
        email: String(fd.get('email') ?? ''),
        note: String(fd.get('note') ?? ''),
      });
      if (!result.success) {
        toast({ title: result.error, variant: 'destructive' });
        return;
      }
      form.reset();
      toast({ title: '게스트를 추가했습니다.' });
    });
  };

  const enterOne = (guest: DropGuest) => {
    const next = guest.tickets.find((t) => t.status === 'active');
    if (!next) return;
    run(async () => {
      const r = await checkInTicket(next.token, drop.id);
      if (!r.success) {
        toast({ title: r.error, variant: 'destructive' });
        return;
      }
      toast({
        title:
          r.result === 'already'
            ? `${guest.buyerName} — 이미 입장 처리돼 있습니다.`
            : `${guest.buyerName} 입장`,
      });
    });
  };

  const undoOne = (guest: DropGuest) => {
    // 가장 최근에 입장 처리한 한 명을 되돌린다
    const last = guest.tickets
      .filter((t) => t.status === 'checked_in')
      .sort(
        (a, b) =>
          new Date(b.checkedInAt ?? 0).getTime() -
          new Date(a.checkedInAt ?? 0).getTime()
      )[0];
    if (!last) return;
    run(async () => {
      const r = await undoCheckIn(last.token, drop.id);
      if (!r.success) toast({ title: r.error, variant: 'destructive' });
    });
  };

  const copyLink = async (guest: DropGuest) => {
    if (!guest.accessToken) return;
    try {
      await navigator.clipboard.writeText(
        getOrderTicketsUrl(guest.accessToken)
      );
      toast({ title: '입장권 링크를 복사했습니다.' });
    } catch {
      toast({ title: '복사하지 못했습니다.', variant: 'destructive' });
    }
  };

  const remove = async () => {
    if (!removeTarget) return;
    const target = removeTarget;
    setRemoveTarget(null);
    run(async () => {
      const r = await cancelOrder(target.id);
      if (!r.success)
        toast({
          title: r.error ?? '삭제하지 못했습니다.',
          variant: 'destructive',
        });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/drops/${drop.id}`} aria-label="드랍으로 돌아가기">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">게스트</h1>
          <p className="text-sm text-muted-foreground">
            {drop.title} · {totalPeople}명 중 {enteredPeople}명 입장
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>게스트 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onAdd} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="guest-name">이름</Label>
              <Input id="guest-name" name="name" required maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-count">인원 (본인 포함)</Label>
              <Input
                id="guest-count"
                name="count"
                type="number"
                inputMode="numeric"
                min={1}
                max={ORDERS.GUEST_MAX_COUNT}
                defaultValue={1}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-phone">연락처 (선택)</Label>
              <Input
                id="guest-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-email">이메일 (선택)</Label>
              <Input
                id="guest-email"
                name="email"
                type="email"
                inputMode="email"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="guest-note">메모 (선택)</Label>
              <Input
                id="guest-note"
                name="note"
                maxLength={100}
                placeholder="예: 아티스트 게스트, 협력사"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending && (
                  <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
                )}
                추가
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">명단</h2>
        <search>
          <Label htmlFor="guest-search" className="sr-only">
            게스트 검색
          </Label>
          <Input
            id="guest-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·연락처·메모로 검색"
          />
        </search>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {filtered.length}팀 표시 중
        </p>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {guests.length === 0
              ? '아직 게스트가 없습니다.'
              : '검색 결과가 없습니다.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((guest) => {
              const total = guest.tickets.length;
              const entered = guest.tickets.filter(
                (t) => t.status === 'checked_in'
              ).length;
              const done = entered === total;
              return (
                <li
                  key={guest.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium">
                      {guest.buyerName}
                      {total > 1 && (
                        <span className="ml-1 text-muted-foreground">
                          +{total - 1}
                        </span>
                      )}
                      <Badge
                        variant={done ? 'default' : 'outline'}
                        className="ml-2 tabular-nums"
                      >
                        {entered}/{total} 입장
                      </Badge>
                    </p>
                    {guest.note && (
                      <p className="text-sm text-muted-foreground">
                        {guest.note}
                      </p>
                    )}
                    {(guest.buyerPhone || guest.buyerEmail) && (
                      <p className="text-xs text-muted-foreground">
                        {[guest.buyerPhone, guest.buyerEmail]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => enterOne(guest)}
                      disabled={pending || done}
                    >
                      입장
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => undoOne(guest)}
                      disabled={pending || entered === 0}
                      aria-label={`${guest.buyerName} 입장 1명 취소`}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyLink(guest)}
                      aria-label={`${guest.buyerName} 입장권 링크 복사`}
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRemoveTarget(guest)}
                      disabled={pending}
                      aria-label={`${guest.buyerName} 삭제`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={() => setRemoveTarget(null)}
        title="게스트 삭제"
        description={
          <>
            {removeTarget?.buyerName}
            {removeTarget && removeTarget.tickets.length > 1
              ? ` 외 ${removeTarget.tickets.length - 1}명`
              : ''}
            을(를) 명단에서 지웁니다. 발급된 입장권도 무효가 됩니다.
          </>
        }
        confirmText="삭제"
        variant="destructive"
        onConfirm={remove}
      />
    </div>
  );
}
