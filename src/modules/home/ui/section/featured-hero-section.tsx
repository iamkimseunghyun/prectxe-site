import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { getImageUrl } from '@/lib/utils';

export async function FeaturedHeroSection() {
  // 1. Check for featured content (program or article)
  const featuredProgram = await prisma.program.findFirst({
    where: { isFeatured: true },
    orderBy: { updatedAt: 'desc' },
    select: {
      slug: true,
      title: true,
      heroUrl: true,
      updatedAt: true,
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

  const featuredArticle = await prisma.article.findFirst({
    where: { isFeatured: true, publishedAt: { not: null } },
    orderBy: { updatedAt: 'desc' },
    select: {
      slug: true,
      title: true,
      cover: true,
      updatedAt: true,
    },
  });

  // Choose between featured program and article (most recently updated)
  let featured:
    | { type: 'program'; data: typeof featuredProgram }
    | { type: 'article'; data: typeof featuredArticle }
    | null = null;

  if (featuredProgram && featuredArticle) {
    featured =
      featuredProgram.updatedAt > featuredArticle.updatedAt
        ? { type: 'program', data: featuredProgram }
        : { type: 'article', data: featuredArticle };
  } else if (featuredProgram) {
    featured = { type: 'program', data: featuredProgram };
  } else if (featuredArticle) {
    featured = { type: 'article', data: featuredArticle };
  }

  // 2. Fallback to default logic if no featured content
  if (!featured) {
    const completed = await prisma.program.findFirst({
      where: { status: 'completed' },
      orderBy: { startAt: 'desc' },
      select: {
        slug: true,
        title: true,
        heroUrl: true,
        updatedAt: true,
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
        updatedAt: true,
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

    const fallbackProgram = completed ?? upcoming;
    if (fallbackProgram) {
      featured = { type: 'program', data: fallbackProgram };
    }
  }

  // 3. Extract display data
  const artists =
    featured?.type === 'program'
      ? featured.data?.credits
          .map((c) => c.artist.name || c.artist.nameKr)
          .filter(Boolean)
          .join(', ')
      : undefined;

  const hero =
    featured?.type === 'program'
      ? featured.data?.heroUrl
        ? getImageUrl(featured.data.heroUrl, 'public')
        : '/images/placeholder.png'
      : featured?.type === 'article'
        ? featured.data?.cover
          ? getImageUrl(featured.data.cover, 'public')
          : '/images/placeholder.png'
        : '/images/placeholder.png';

  const slug = featured?.data?.slug;
  const title = featured?.data?.title;
  const linkHref =
    featured?.type === 'program'
      ? `/programs/${slug}`
      : featured?.type === 'article'
        ? `/journal/${slug}`
        : '/';

  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-4">
        {featured && slug && title ? (
          <Link href={linkHref} className="block h-full">
            <div className="relative h-[600px] w-full sm:h-[700px] md:h-[800px] lg:h-[900px]">
              <Image
                src={hero}
                alt={title}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center p-6 text-white md:p-12">
                <div className="max-w-4xl space-y-2 rounded-xl bg-black/40 px-8 py-6 text-center backdrop-blur-md sm:px-12 sm:py-8">
                  <h1 className="font-serif text-xl font-light tracking-wide sm:text-2xl md:text-3xl">
                    {title}
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
          <div className="flex h-[600px] items-center justify-center sm:h-[700px] md:h-[800px] lg:h-[900px]">
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
      </div>

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-neutral-400">
        © 2026 PRECTXE
      </p>
    </section>
  );
}
