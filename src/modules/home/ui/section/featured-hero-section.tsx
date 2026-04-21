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

  // 2. Fallback 순서: upcoming 우선(티켓 유도) → completed (아카이브)
  if (!featured) {
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

    const fallbackProgram = upcoming ?? completed;
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
              {/* 어두운 그라디언트 오버레이 — 대비 개선 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-12 lg:p-20">
                <div className="mx-auto max-w-6xl space-y-4">
                  <h1 className="max-w-4xl text-3xl font-light leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                    {title}
                  </h1>
                  {artists && (
                    <p className="text-sm font-light uppercase tracking-[0.25em] text-white/80 sm:text-base">
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
      </div>
    </section>
  );
}
