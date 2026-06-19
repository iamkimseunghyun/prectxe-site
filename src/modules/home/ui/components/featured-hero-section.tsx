import { ArrowUpRight } from 'lucide-react';
import { unstable_cache as next_cache } from 'next/cache';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { cn, getImageUrl } from '@/lib/utils';
import { getEffectiveDropStatus } from '@/lib/utils/ticket-status';

// 홈 read-path 캐시(초). featured 토글/발행 변경은 최대 이 시간 후 반영.
const HOME_REVALIDATE = 300;

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

// 데이터 조회 + featured 선택 + 렌더 데이터 정규화를 한 번에 캐시.
// featured 3종(program/article/drop)은 상호 독립이라 Promise.all로 병렬 조회.
const getFeaturedHero = next_cache(
  async () => {
    const [featuredProgram, featuredArticle, featuredDrop] = await Promise.all([
      prisma.program.findFirst({
        where: { isFeatured: true },
        orderBy: { updatedAt: 'desc' },
        select: {
          slug: true,
          title: true,
          heroUrl: true,
          updatedAt: true,
          credits: {
            select: { artist: { select: { name: true, nameKr: true } } },
          },
        },
      }),
      prisma.article.findFirst({
        where: { isFeatured: true, publishedAt: { not: null } },
        orderBy: { updatedAt: 'desc' },
        select: { slug: true, title: true, cover: true, updatedAt: true },
      }),
      prisma.drop.findFirst({
        where: { isFeatured: true, publishedAt: { not: null } },
        orderBy: { updatedAt: 'desc' },
        select: {
          slug: true,
          title: true,
          type: true,
          updatedAt: true,
          media: {
            where: { type: 'image' },
            orderBy: { order: 'asc' },
            take: 1,
            select: { url: true },
          },
          credits: {
            select: { artist: { select: { name: true, nameKr: true } } },
          },
          ticketTiers: {
            select: {
              saleStart: true,
              saleEnd: true,
              soldCount: true,
              quantity: true,
            },
          },
          variants: { select: { stock: true, soldCount: true } },
        },
      }),
    ]);

    // 가장 최근 갱신된 featured 1개 선택 (program / article / drop 상호 배타)
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

    // featured 없으면 upcoming → completed program 폴백 (티켓 유도 우선)
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

    if (!featured) return null;

    // 렌더 데이터 정규화 (직렬화 가능한 primitive만 반환 → 캐시 안전)
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

    if (featured.type === 'program') {
      hero = featured.data.heroUrl
        ? getImageUrl(featured.data.heroUrl, 'public')
        : '/images/placeholder.png';
      href = `/programs/${slug}`;
      artists = creditsOf(featured.data.credits);
    } else if (featured.type === 'article') {
      hero = featured.data.cover
        ? getImageUrl(featured.data.cover, 'public')
        : '/images/placeholder.png';
      href = `/journal/${slug}`;
    } else {
      const img = featured.data.media[0]?.url;
      hero = img ? getImageUrl(img, 'public') : '/images/placeholder.png';
      href = `/drops/${slug}`;
      artists = creditsOf(featured.data.credits);
    }

    // 파생 상태(데이터)만 캐시. UI 라벨은 렌더 시점에 결정(i18n 대비).
    const dropStatus =
      featured.type === 'drop'
        ? getEffectiveDropStatus({
            type: featured.data.type as 'ticket' | 'goods',
            ticketTiers: featured.data.ticketTiers,
            variants: featured.data.variants,
          })
        : null;

    return {
      hero,
      href,
      title,
      artists,
      featuredType: featured.type,
      dropStatus,
    };
  },
  ['home-featured-hero'],
  // featured는 program/article/drop 중 하나 → 세 도메인 태그 모두로 무효화
  { revalidate: HOME_REVALIDATE, tags: ['programs', 'journal', 'drops'] }
);

export async function FeaturedHeroSection() {
  const featured = await getFeaturedHero();

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

  const { hero, href, title, artists, featuredType, dropStatus } = featured;
  const cta =
    featuredType === 'program'
      ? { label: '자세히 보기', active: true }
      : featuredType === 'article'
        ? { label: '읽어보기', active: true }
        : dropCta(dropStatus ?? '');

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
