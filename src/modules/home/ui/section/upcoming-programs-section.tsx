import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { formatEventDate, getImageUrl } from '@/lib/utils';

export async function UpcomingProgramsSection() {
  const programs = await prisma.program.findMany({
    where: { status: 'upcoming' },
    take: 3,
    orderBy: { startAt: 'asc' },
    select: {
      slug: true,
      title: true,
      summary: true,
      heroUrl: true,
      startAt: true,
      endAt: true,
      city: true,
      venue: true,
    },
  });

  if (programs.length === 0) return null;

  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-screen-2xl px-6 md:px-12 lg:px-24">
        <div className="mb-14 flex items-end justify-between gap-6 md:mb-20">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500 md:mb-6">
              What's Next
            </p>
            <h2 className="text-3xl font-light leading-[1.15] tracking-tight text-neutral-900 md:text-5xl lg:text-6xl">
              Upcoming
            </h2>
          </div>
          <Link
            href="/programs"
            className="hidden shrink-0 items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 sm:inline-flex"
          >
            전체 프로그램 <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {programs.map((program) => {
            const dateLabel = program.startAt
              ? formatEventDate(
                  program.startAt,
                  program.endAt ?? program.startAt
                )
              : null;
            const location = [program.venue, program.city]
              .filter(Boolean)
              .join(' · ');

            return (
              <Link
                key={program.slug}
                href={`/programs/${program.slug}`}
                className="group block"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-neutral-100">
                  {program.heroUrl ? (
                    <Image
                      src={getImageUrl(program.heroUrl, 'public')}
                      alt={program.title}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 to-neutral-100" />
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
          전체 프로그램 <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
