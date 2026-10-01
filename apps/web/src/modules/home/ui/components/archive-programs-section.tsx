import { ArrowUpRight } from 'lucide-react';
import { unstable_cache as next_cache } from 'next/cache';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { formatKstDateRange, getImageUrl } from '@/lib/utils';

const PROGRAM_SELECT = {
  slug: true,
  title: true,
  summary: true,
  heroUrl: true,
  startAt: true,
  endAt: true,
  city: true,
  venue: true,
} as const;

/**
 * 홈페이지 프로그램(아카이브) 섹션.
 * Program은 아카이브 전용 — draft가 아닌 지난 프로그램 3개(startAt 내림차순).
 * 날짜 라벨은 캐시 내부에서 문자열로 미리 계산(직렬화 안전).
 */
const getArchivePrograms = next_cache(
  async () => {
    const rows = await prisma.program.findMany({
      where: { status: { not: 'draft' } },
      take: 3,
      orderBy: { startAt: 'desc' },
      select: PROGRAM_SELECT,
    });

    return rows.map((p) => ({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      heroUrl: p.heroUrl,
      startAtIso: p.startAt ? p.startAt.toISOString() : null,
      endAtIso: p.endAt ? p.endAt.toISOString() : null,
      location: [p.venue, p.city].filter(Boolean).join(' · '),
    }));
  },
  ['home-archive-programs'],
  { revalidate: 300, tags: ['programs'] }
);

export async function ArchiveProgramsSection() {
  const programs = await getArchivePrograms();

  if (programs.length === 0) return null;

  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-(--breakpoint-2xl) px-6 md:px-12 lg:px-24">
        <div className="mb-14 flex items-end justify-between gap-6 md:mb-20">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500 md:mb-6">
              Unfolding Scenes
            </p>
            <h2 className="text-3xl font-light leading-[1.15] tracking-tight text-neutral-900 md:text-5xl lg:text-6xl">
              Archive
            </h2>
          </div>
          <Link
            href="/programs"
            className="hidden shrink-0 items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 sm:inline-flex"
          >
            아카이브 보기 <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {programs.map((program) => {
            const dateLabel = program.startAtIso
              ? formatKstDateRange(
                  new Date(program.startAtIso),
                  new Date(program.endAtIso ?? program.startAtIso)
                )
              : null;
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
                  <span className="absolute left-3 top-3 rounded-full bg-neutral-900/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-xs">
                    Archive
                  </span>
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
          아카이브 보기 <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
