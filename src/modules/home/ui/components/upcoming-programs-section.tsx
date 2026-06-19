import { ArrowUpRight } from 'lucide-react';
import { unstable_cache as next_cache } from 'next/cache';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { cn, formatKstDateRange, getImageUrl } from '@/lib/utils';

const PROGRAM_SELECT = {
  slug: true,
  title: true,
  summary: true,
  heroUrl: true,
  status: true,
  startAt: true,
  endAt: true,
  city: true,
  venue: true,
} as const;

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  upcoming: {
    label: 'Upcoming',
    className: 'bg-white/95 text-neutral-900',
  },
  completed: {
    label: 'Archive',
    className: 'bg-neutral-900/75 text-white',
  },
};

/**
 * 홈페이지 프로그램 섹션 데이터.
 * - upcoming 3개 우선 (startAt 오름차순)
 * - 없으면 최근 completed 3개로 폴백 (startAt 내림차순) + 라벨 교체
 * 날짜 라벨은 캐시 내부에서 문자열로 미리 계산(직렬화 안전).
 */
const getHomePrograms = next_cache(
  async () => {
    const upcoming = await prisma.program.findMany({
      where: { status: 'upcoming' },
      take: 3,
      orderBy: { startAt: 'asc' },
      select: PROGRAM_SELECT,
    });

    const isUpcoming = upcoming.length > 0;
    const rows = isUpcoming
      ? upcoming
      : await prisma.program.findMany({
          where: { status: 'completed' },
          take: 3,
          orderBy: { startAt: 'desc' },
          select: PROGRAM_SELECT,
        });

    const programs = rows.map((p) => ({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      heroUrl: p.heroUrl,
      status: p.status,
      dateLabel: p.startAt
        ? formatKstDateRange(p.startAt, p.endAt ?? p.startAt)
        : null,
      location: [p.venue, p.city].filter(Boolean).join(' · '),
    }));

    return { isUpcoming, programs };
  },
  ['home-upcoming-programs'],
  { revalidate: 300 }
);

export async function UpcomingProgramsSection() {
  const { isUpcoming, programs } = await getHomePrograms();

  if (programs.length === 0) return null;

  const eyebrow = isUpcoming ? "What's Next" : 'Unfolding Scenes';
  const title = isUpcoming ? 'Upcoming' : 'Archive';
  const ctaText = isUpcoming ? '전체 프로그램' : '아카이브 보기';

  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-(--breakpoint-2xl) px-6 md:px-12 lg:px-24">
        <div className="mb-14 flex items-end justify-between gap-6 md:mb-20">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500 md:mb-6">
              {eyebrow}
            </p>
            <h2 className="text-3xl font-light leading-[1.15] tracking-tight text-neutral-900 md:text-5xl lg:text-6xl">
              {title}
            </h2>
          </div>
          <Link
            href="/programs"
            className="hidden shrink-0 items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 sm:inline-flex"
          >
            {ctaText} <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {programs.map((program) => {
            const dateLabel = program.dateLabel;
            const location = program.location;

            return (
              <Link
                key={program.slug}
                href={`/programs/${program.slug}`}
                className="group block"
              >
                <div className="relative aspect-4/5 overflow-hidden rounded-lg bg-neutral-100">
                  {program.heroUrl ? (
                    <Image
                      src={getImageUrl(program.heroUrl, 'public')}
                      alt={program.title}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-linear-to-br from-neutral-200 to-neutral-100" />
                  )}
                  {STATUS_STYLE[program.status] && (
                    <span
                      className={cn(
                        'absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] backdrop-blur-xs',
                        STATUS_STYLE[program.status].className
                      )}
                    >
                      {STATUS_STYLE[program.status].label}
                    </span>
                  )}
                </div>

                <div className="mt-5 space-y-2">
                  {dateLabel && (
                    <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-neutral-400">
                      {dateLabel}
                    </p>
                  )}
                  <h3 className="text-lg font-medium leading-snug text-neutral-900 transition-colors group-hover:text-neutral-600 md:text-xl">
                    {program.title}
                  </h3>
                  {location && (
                    <p className="text-sm text-neutral-500">{location}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <Link
          href="/programs"
          className="mt-10 inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 sm:hidden"
        >
          {ctaText} <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
