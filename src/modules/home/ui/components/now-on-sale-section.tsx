import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { cn, getImageUrl } from '@/lib/utils';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  on_sale: {
    label: 'On Sale',
    className: 'bg-white text-neutral-950',
  },
  upcoming: {
    label: 'Coming Soon',
    className: 'bg-white/10 text-white',
  },
  sold_out: {
    label: 'Sold Out',
    className: 'bg-red-500/20 text-red-300',
  },
};

export async function NowOnSaleSection() {
  const drops = await prisma.drop.findMany({
    where: {
      status: { in: ['on_sale', 'upcoming'] },
      publishedAt: { not: null },
    },
    take: 3,
    orderBy: [{ eventDate: 'asc' }, { publishedAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      type: true,
      status: true,
      eventDate: true,
      media: {
        where: { type: 'image' },
        orderBy: { order: 'asc' },
        take: 1,
        select: { url: true },
      },
      ticketTiers: { select: { price: true } },
      variants: { select: { price: true } },
    },
  });

  if (drops.length === 0) return null;

  return (
    <section className="bg-neutral-950 py-24 text-white md:py-32">
      <div className="mx-auto max-w-screen-2xl px-6 md:px-12 lg:px-24">
        <div className="mb-14 flex items-end justify-between gap-6 md:mb-20">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500 md:mb-6">
              Now Available
            </p>
            <h2 className="text-3xl font-light leading-[1.15] tracking-tight md:text-5xl lg:text-6xl">
              Drops
            </h2>
          </div>
          <Link
            href="/drops"
            className="hidden shrink-0 items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white sm:inline-flex"
          >
            전체 보기 <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {drops.map((drop) => {
            const img = drop.media[0]?.url;
            const prices =
              drop.type === 'ticket'
                ? drop.ticketTiers.map((t) => t.price)
                : drop.variants.map((v) => v.price);
            const minPrice = prices.length > 0 ? Math.min(...prices) : null;
            const status = STATUS_LABEL[drop.status];

            return (
              <Link
                key={drop.id}
                href={`/drops/${drop.slug}`}
                className="group block"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-neutral-900">
                  {img ? (
                    <Image
                      src={getImageUrl(img, 'public')}
                      alt={drop.title}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
                  )}
                  {status && (
                    <span
                      className={cn(
                        'absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] backdrop-blur-sm',
                        status.className
                      )}
                    >
                      {status.label}
                    </span>
                  )}
                </div>

                <div className="mt-5 space-y-2">
                  <h3 className="text-lg font-medium leading-snug transition-colors group-hover:text-neutral-300 md:text-xl">
                    {drop.title}
                  </h3>
                  {drop.summary && (
                    <p className="line-clamp-2 text-sm text-neutral-500">
                      {drop.summary}
                    </p>
                  )}
                  {minPrice !== null && (
                    <p className="pt-1 text-sm font-medium text-white">
                      {minPrice === 0
                        ? 'FREE'
                        : `${minPrice.toLocaleString()}원${prices.length > 1 ? '~' : ''}`}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <Link
          href="/drops"
          className="mt-10 inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white sm:hidden"
        >
          전체 보기 <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
