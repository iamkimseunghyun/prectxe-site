import { Package, Ticket } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getImageUrl } from '@/lib/utils';
import { listDrops } from '@/modules/drops/server/actions';

interface DropsListViewProps {
  type?: 'ticket' | 'goods';
  page: number;
}

export async function DropsListView({ type, page }: DropsListViewProps) {
  const { items, total, pageSize } = await listDrops(page, 20, type);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Drops</h1>
        <p className="mt-2 text-muted-foreground">티켓과 굿즈를 만나보세요.</p>

        {/* Type Filter */}
        <div className="mt-4 flex gap-2">
          <Link
            href="/drops"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !type
                ? 'bg-neutral-900 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            전체
          </Link>
          <Link
            href="/drops?type=ticket"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              type === 'ticket'
                ? 'bg-neutral-900 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Ticket className="mr-1 inline h-4 w-4" />
            티켓
          </Link>
          <Link
            href="/drops?type=goods"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              type === 'goods'
                ? 'bg-neutral-900 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Package className="mr-1 inline h-4 w-4" />
            굿즈
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          아직 등록된 Drop이 없습니다.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((drop) => {
            const heroImage = drop.images[0]?.imageUrl ?? drop.heroUrl;
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

            return (
              <Link
                key={drop.id}
                href={`/drops/${drop.slug}`}
                className="group"
              >
                <div className="overflow-hidden rounded-xl border transition-shadow hover:shadow-lg">
                  {heroImage ? (
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      <img
                        src={getImageUrl(heroImage, 'public')}
                        alt={drop.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <Badge
                        variant="secondary"
                        className="absolute left-3 top-3"
                      >
                        {drop.type === 'ticket' ? '티켓' : '굿즈'}
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-muted">
                      {drop.type === 'ticket' ? (
                        <Ticket className="h-10 w-10 text-muted-foreground" />
                      ) : (
                        <Package className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold">{drop.title}</h3>
                    {drop.summary && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {drop.summary}
                      </p>
                    )}
                    <p className="mt-2 text-lg font-bold">
                      {hasPrice
                        ? minPrice === 0
                          ? '무료'
                          : `${minPrice.toLocaleString()}원~`
                        : '가격 미정'}
                    </p>
                  </div>
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
