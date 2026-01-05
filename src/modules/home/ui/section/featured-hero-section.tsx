import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { getImageUrl } from '@/lib/utils';

export async function FeaturedHeroSection() {
  // Archive-first: pick the most recent completed program; fallback to upcoming
  const completed = await prisma.program.findFirst({
    where: { status: 'completed' },
    orderBy: { startAt: 'desc' },
    select: {
      slug: true,
      title: true,
      heroUrl: true,
      credits: {
        select: {
          artist: {
            select: {
              name: true,
              nameKr: true,
            },
          },
        },
      },
    },
  });

  const upcoming = await prisma.program.findFirst({
    where: { status: 'upcoming' },
    orderBy: { startAt: 'asc' },
    select: {
      slug: true,
      title: true,
      heroUrl: true,
      credits: {
        select: {
          artist: {
            select: {
              name: true,
              nameKr: true,
            },
          },
        },
      },
    },
  });

  const featured = completed ?? upcoming;

  const artists = featured?.credits
    .map((c) => c.artist.name || c.artist.nameKr)
    .filter(Boolean)
    .join(', ');

  const hero = featured?.heroUrl
    ? getImageUrl(featured.heroUrl, 'public')
    : '/images/placeholder.png';

  return (
    <section className="min-h-screen">
      {featured ? (
        <Link href={`/programs/${featured.slug}`} className="block h-full">
          <div className="relative h-[60vh] w-full md:h-[70vh]">
            <Image
              src={hero}
              alt={featured.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center p-6 text-white md:p-12">
              <div className="max-w-4xl space-y-2 rounded-xl bg-black/40 px-8 py-6 text-center backdrop-blur-md sm:px-12 sm:py-8">
                <h1 className="font-serif text-xl font-light tracking-wide sm:text-2xl md:text-3xl">
                  {featured.title}
                </h1>
                {artists && (
                  <p className="font-sans text-xs font-light tracking-wider text-white/80 sm:text-sm">
                    {artists}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="flex h-[60vh] items-center justify-center md:h-[70vh]">
          <p className="text-neutral-400">프로그램이 없습니다</p>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 py-6 text-xs sm:gap-6 sm:py-8 sm:text-sm md:text-base">
        <Link
          href="/programs"
          className="text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Archive
        </Link>
        <Link
          href="/journal"
          className="text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Journal
        </Link>
        <Link
          href="/about"
          className="text-neutral-500 transition-colors hover:text-neutral-900"
        >
          About
        </Link>
      </div>
    </section>
  );
}
