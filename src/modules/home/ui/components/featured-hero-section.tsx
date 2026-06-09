import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { cn, getImageUrl } from '@/lib/utils';

// Drop 상태별 CTA 라벨/활성 여부.
// active=true → 흰색 실 버튼(전환 유도), false → 안내성 라벨.
function dropCta(status: string): { label: string; active: boolean } {
  switch (status) {
    case 'on_sale':
      return { label: '예매하기', active: true };
    case 'upcoming':
      return { label: '오픈 예정', active: false };
    case 'sold_out':
      return { label: '매진', active: false };
    case 'closed':
      return { label: '판매 종료', active: false };
    default:
      return { label: '자세히 보기', active: true };
  }
}

export async function FeaturedHeroSection() {
  // 1. featured 후보 조회 (program / article / drop)
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

  const featuredDrop = await prisma.drop.findFirst({
    where: { isFeatured: true, publishedAt: { not: null } },
    orderBy: { updatedAt: 'desc' },
    select: {
      slug: true,
      title: true,
      status: true,
      type: true,
      updatedAt: true,
      media: {
        where: { type: 'image' },
        orderBy: { order: 'asc' },
        take: 1,
        select: { url: true },
      },
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

  // 2. 가장 최근 갱신된 featured 1개 선택 (program / article / drop 상호 배타)
  type Featured =
    | { type: 'program'; data: NonNullable<typeof featuredProgram> }
    | { type: 'article'; data: NonNullable<typeof featuredArticle> }
    | { type: 'drop'; data: NonNullable<typeof featuredDrop> };

  const candidates: Featured[] = [];
  if (featuredProgram)
    candidates.push({ type: 'program', data: featuredProgram });
  if (featuredArticle)
    candidates.push({ type: 'article', data: featuredArticle });
  if (featuredDrop) candidates.push({ type: 'drop', data: featuredDrop });

  let featured: Featured | null =
    candidates.length > 0
      ? candidates.reduce((latest, c) =>
          c.data.updatedAt > latest.data.updatedAt ? c : latest
        )
      : null;

  // 3. featured 없으면 upcoming → completed program 폴백 (티켓 유도 우선)
  if (!featured) {
    const fallbackProgram =
      (await prisma.program.findFirst({
        where: { status: 'upcoming' },
        orderBy: { startAt: 'asc' },
        select: {
          slug: true,
          title: true,
          heroUrl: true,
          updatedAt: true,
          credits: {
            select: { artist: { select: { name: true, nameKr: true } } },
          },
        },
      })) ??
      (await prisma.program.findFirst({
        where: { status: 'completed' },
        orderBy: { startAt: 'desc' },
        select: {
          slug: true,
          title: true,
          heroUrl: true,
          updatedAt: true,
          credits: {
            select: { artist: { select: { name: true, nameKr: true } } },
          },
        },
      }));

    if (fallbackProgram) {
      featured = { type: 'program', data: fallbackProgram };
    }
  }

  if (!featured) {
    return (
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-[600px] items-center justify-center sm:h-[700px] md:h-[800px] lg:h-[900px]">
            <p className="text-neutral-400">프로그램이 없습니다</p>
          </div>
        </div>
      </section>
    );
  }

  // 4. 표시 데이터 정규화
  const slug = featured.data.slug;
  const title = featured.data.title;

  const creditsOf = (
    credits: { artist: { name: string | null; nameKr: string | null } }[]
  ) =>
    credits
      .map((c) => c.artist.name || c.artist.nameKr)
      .filter(Boolean)
      .join(', ') || undefined;

  let hero: string;
  let href: string;
  let artists: string | undefined;
  let cta: { label: string; active: boolean };

  if (featured.type === 'program') {
    hero = featured.data.heroUrl
      ? getImageUrl(featured.data.heroUrl, 'public')
      : '/images/placeholder.png';
    href = `/programs/${slug}`;
    artists = creditsOf(featured.data.credits);
    cta = { label: '자세히 보기', active: true };
  } else if (featured.type === 'article') {
    hero = featured.data.cover
      ? getImageUrl(featured.data.cover, 'public')
      : '/images/placeholder.png';
    href = `/journal/${slug}`;
    cta = { label: '읽어보기', active: true };
  } else {
    const img = featured.data.media[0]?.url;
    hero = img ? getImageUrl(img, 'public') : '/images/placeholder.png';
    href = `/drops/${slug}`;
    artists = creditsOf(featured.data.credits);
    cta = dropCta(featured.data.status);
  }

  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-4">
        <Link href={href} className="group block h-full">
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
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-12 lg:p-20">
              <div className="mx-auto max-w-6xl space-y-5">
                <div className="space-y-4">
                  <h1 className="max-w-4xl text-3xl font-light leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                    {title}
                  </h1>
                  {artists && (
                    <p className="text-sm font-light uppercase tracking-[0.25em] text-white/80 sm:text-base">
                      {artists}
                    </p>
                  )}
                </div>

                {/* 상태별 CTA — outer Link 내부의 시각적 버튼(중첩 anchor 회피) */}
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-medium transition-colors',
                    cta.active
                      ? 'bg-white text-neutral-950 group-hover:bg-white/90'
                      : 'border border-white/40 text-white/90'
                  )}
                >
                  {cta.label}
                  {cta.active && <ArrowUpRight className="h-4 w-4" />}
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
