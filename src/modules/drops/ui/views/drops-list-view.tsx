import { Package, Ticket } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { FilterChip } from '@/components/shared/filter-chip';
import { Badge } from '@/components/ui/badge';
import { cn, getImageUrl } from '@/lib/utils';
import { listDrops } from '@/modules/drops/server/actions';

interface DropsListViewProps {
  type?: 'ticket' | 'goods';
  page: number;
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  on_sale: {
    label: 'On Sale',
    className: 'bg-neutral-900 text-white',
  },
  upcoming: {
    label: 'Coming Soon',
    className: 'bg-white/90 text-neutral-900',
  },
  sold_out: {
    label: 'Sold Out',
    className: 'bg-red-500 text-white',
  },
  closed: {
    label: 'Closed',
    className: 'bg-neutral-200 text-neutral-500',
  },
};

/** 현재 시각 기준 D-day. 미래면 양수(D-N), 당일 0(D-day), 과거면 null */
function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  const target = new Date(date);
  const ms = target.setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0);
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : null;
}

function formatDropDate(date: Date | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export async function DropsListView({ type, page }: DropsListViewProps) {
  const { items, total, pageSize } = await listDrops(page, 20, type);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-28">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Drops</h1>
        <p className="mt-2 text-muted-foreground">티켓과 굿즈를 만나보세요.</p>

        {/* Type Filter */}
        <div className="mt-6 flex flex-wrap gap-2">
          <FilterChip href="/drops" active={!type}>
            전체
          </FilterChip>
          <FilterChip href="/drops?type=ticket" active={type === 'ticket'}>
            <Ticket className="mr-1 inline h-4 w-4" />
            티켓
          </FilterChip>
          <FilterChip href="/drops?type=goods" active={type === 'goods'}>
            <Package className="mr-1 inline h-4 w-4" />
            굿즈
          </FilterChip>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          아직 등록된 Drop이 없습니다.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((drop) => {
            const heroImage = drop.media[0]?.url;
            const minPrice =
              drop.type === 'ticket'
                ? Math.min(
                    ...drop.ticketTiers.map((t) => t.price),
                    Number.MAX_SAFE_INTEGER
                  )
                : Math.min(
                    ...drop.variants.map((v) => v.price),
                    Number.MAX_SAFE_INTEGER
                  );
            const hasPrice = minPrice !== Number.MAX_SAFE_INTEGER;

            const status = STATUS_STYLE[drop.status];
            const dDay =
              drop.type === 'ticket' ? daysUntil(drop.eventDate) : null;
            const eventDateLabel =
              drop.type === 'ticket' ? formatDropDate(drop.eventDate) : null;

            return (
              <Link
                key={drop.id}
                href={`/drops/${drop.slug}`}
                className="group block"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100">
                  {heroImage ? (
                    <Image
                      src={getImageUrl(heroImage, 'public')}
                      alt={drop.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      {drop.type === 'ticket' ? (
                        <Ticket className="h-10 w-10 text-neutral-400" />
                      ) : (
                        <Package className="h-10 w-10 text-neutral-400" />
                      )}
                    </div>
                  )}

                  {/* 상태 뱃지 (좌상단) */}
                  {status && (
                    <span
                      className={cn(
                        'absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] backdrop-blur-sm',
                        status.className
                      )}
                    >
                      {status.label}
                    </span>
                  )}

                  {/* 타입 뱃지 (우상단) */}
                  <Badge
                    variant="secondary"
                    className="absolute right-3 top-3 bg-white/85 text-neutral-700 backdrop-blur-sm"
                  >
                    {drop.type === 'ticket' ? '티켓' : '굿즈'}
                  </Badge>
                </div>

                <div className="mt-4 space-y-1.5">
                  <h3 className="text-base font-medium leading-snug text-neutral-900 transition-colors group-hover:text-neutral-600">
                    {drop.title}
                  </h3>
                  {drop.summary && (
                    <p className="line-clamp-2 text-sm text-neutral-500">
                      {drop.summary}
                    </p>
                  )}

                  {eventDateLabel && (
                    <p className="flex items-center gap-2 pt-1 text-xs font-medium text-neutral-600">
                      <span className="tabular-nums">{eventDateLabel}</span>
                      {dDay !== null && (
                        <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {dDay === 0 ? 'D-DAY' : `D-${dDay}`}
                        </span>
                      )}
                    </p>
                  )}

                  <p className="pt-1 text-base font-semibold tabular-nums text-neutral-900">
                    {hasPrice
                      ? minPrice === 0
                        ? 'FREE'
                        : `${minPrice.toLocaleString()}원~`
                      : '가격 미정'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/drops?${type ? `type=${type}&` : ''}page=${page - 1}`}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              이전
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/drops?${type ? `type=${type}&` : ''}page=${page + 1}`}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              다음
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
