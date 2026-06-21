'use client';

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Minus,
  Play,
  Plus,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CloudflareStreamVideo } from '@/components/media/cloudflare-stream-video';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { ShareButton } from '@/components/shared/share-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trackViewItem } from '@/lib/analytics/gtag';
import { trackMetaViewContent } from '@/lib/analytics/meta-pixel';
import { SALES_TERMS } from '@/lib/constants/sales-terms';
import { artistInitials, cn, formatArtistName, getImageUrl } from '@/lib/utils';
import { getEffectiveDropStatus } from '@/lib/utils/ticket-status';
import { GoodsPurchaseSection } from '@/modules/drops/ui/components/goods-purchase-section';
import { MediaLightbox } from '@/modules/drops/ui/components/media-lightbox';
import { MobilePurchaseBar } from '@/modules/drops/ui/components/mobile-purchase-bar';

type GoodsVariant = {
  id: string;
  name: string;
  price: number;
  stock: number;
  soldCount: number;
  options: unknown;
  order: number;
};

type DropMedia = {
  id: string;
  type: 'image' | 'video';
  url: string;
  alt: string;
  order: number;
};

type DropCredit = {
  dropId: string;
  artistId: string;
  role: string;
  artist: {
    id: string;
    name: string;
    nameKr: string | null;
    mainImageUrl: string | null;
  };
};

type GoodsDrop = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  notice: string | null;
  media: DropMedia[];
  credits: DropCredit[];
  variants: GoodsVariant[];
};

export function GoodsDropDetailView({ drop }: { drop: GoodsDrop }) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const lowestPrice = drop.variants.length
    ? Math.min(...drop.variants.map((v) => v.price))
    : 0;

  useEffect(() => {
    trackViewItem({
      id: drop.id,
      name: drop.title,
      category: 'goods',
      price: lowestPrice,
    });
    trackMetaViewContent({
      id: drop.id,
      name: drop.title,
      category: 'goods',
      price: lowestPrice,
    });
  }, [drop.id, drop.title, lowestPrice]);

  // 통합 미디어 목록 — DropMedia 배열 그대로 (관리자가 DnD로 순서 지정)
  const allMedia: DropMedia[] = drop.media;
  const totalMedia = allMedia.length;
  const activeMedia = allMedia[activeMediaIndex];
  const showingVideo = activeMedia?.type === 'video';

  const selected = drop.variants.find((v) => v.id === selectedVariant);
  const remaining = selected ? selected.stock - selected.soldCount : 0;
  // 옵션이 없으면 effectiveStatus='upcoming' → 구매 섹션 비활성(오동작 방지).
  // on_sale일 때만 구매 가능, 재고 소진 시 sold_out.
  const effectiveStatus = getEffectiveDropStatus({
    type: 'goods',
    variants: drop.variants,
  });
  const isSoldOut = effectiveStatus === 'sold_out';
  const isSaleActive = effectiveStatus === 'on_sale';

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b">
        <div className="mx-auto flex max-w-(--breakpoint-2xl) items-center px-4 py-3 sm:px-6">
          <Link
            href="/drops"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Drops</span>
          </Link>
          <LocaleSwitcher className="ml-auto text-neutral-500" />
          <ShareButton
            title={drop.title}
            text={drop.summary}
            label="공유"
            iconClassName="h-4 w-4"
            className="ml-4 inline-flex items-center gap-1.5 rounded text-sm text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </nav>

      <div className="mx-auto max-w-(--breakpoint-2xl) px-4 sm:px-6">
        <div className="lg:flex">
          {/* ── Image Gallery (left: 3/5) ── */}
          <div className="lg:basis-3/5 lg:border-r">
            <div className="relative py-6 lg:pr-8 lg:py-12">
              {totalMedia > 0 ? (
                <>
                  {/* Main Media */}
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
                    {/* 이미지/비디오를 감싸는 시맨틱 버튼 — 라이트박스 트리거.
                        prev/next 버튼과 형제로 분리해 대화형 요소 중첩을 피한다. */}
                    <button
                      type="button"
                      aria-label="이미지 확대"
                      className="absolute inset-0 h-full w-full cursor-zoom-in rounded-2xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() => setLightboxOpen(true)}
                    >
                      {showingVideo && activeMedia ? (
                        <>
                          <CloudflareStreamVideo
                            key={activeMedia.id}
                            videoUrl={activeMedia.url}
                            autoPlay
                            muted
                            loop
                            controls={false}
                            className="h-full w-full object-contain"
                          />
                          {/* 재생 오버레이 — 클릭 시 라이트박스에서 풀 재생 */}
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-lg">
                              <Play className="ml-0.5 h-6 w-6 fill-current" />
                            </div>
                          </div>
                        </>
                      ) : activeMedia ? (
                        <Image
                          src={getImageUrl(activeMedia.url, 'hires')}
                          alt={activeMedia.alt}
                          fill
                          priority
                          sizes="(min-width: 1024px) 60vw, 100vw"
                          className="object-contain"
                        />
                      ) : null}
                    </button>

                    {/* Prev / Next Arrows — 트리거 버튼과 형제(중첩 해소), z-10으로 위에 */}
                    {totalMedia > 1 && (
                      <>
                        <button
                          type="button"
                          aria-label="이전"
                          className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/80 text-neutral-600 backdrop-blur-xs transition-all hover:scale-110 hover:border-white hover:bg-white"
                          onClick={() =>
                            setActiveMediaIndex(
                              (i) => (i - 1 + totalMedia) % totalMedia
                            )
                          }
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          aria-label="다음"
                          className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/80 text-neutral-600 backdrop-blur-xs transition-all hover:scale-110 hover:border-white hover:bg-white"
                          onClick={() =>
                            setActiveMediaIndex((i) => (i + 1) % totalMedia)
                          }
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnails */}
                  {totalMedia > 1 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {allMedia.map((m, idx) => (
                        <button
                          key={m.id}
                          type="button"
                          aria-label={
                            m.type === 'video' ? '영상' : `이미지 ${idx + 1}`
                          }
                          className={cn(
                            'relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border-2 transition-all',
                            activeMediaIndex === idx
                              ? 'border-neutral-900 ring-1 ring-neutral-900'
                              : 'border-transparent opacity-60 hover:opacity-100'
                          )}
                          onClick={() => setActiveMediaIndex(idx)}
                        >
                          {m.type === 'video' ? (
                            <span className="text-2xl">▶</span>
                          ) : (
                            <Image
                              src={getImageUrl(m.url, 'thumbnail')}
                              alt={m.alt}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-2xl bg-neutral-100">
                  <span className="text-4xl text-neutral-300">No Image</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Product Info (right: 2/5) ── */}
          <div id="goods-purchase" className="scroll-mt-6 lg:basis-2/5">
            <div className="py-6 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-auto lg:py-12 lg:pl-8">
              {/* Title & Price */}
              <div className="border-b pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                  {drop.title}
                </h1>
                {drop.summary && (
                  <p className="mt-3 text-base text-neutral-500">
                    {drop.summary}
                  </p>
                )}
                {drop.credits?.length ? (
                  <ul className="mt-4 flex flex-wrap gap-3">
                    {drop.credits.map((c) => {
                      const kr = c.artist?.nameKr || null;
                      const en = c.artist?.name || null;
                      const name = formatArtistName(kr, en);
                      const img = c.artist?.mainImageUrl || undefined;
                      const initials = artistInitials(
                        en || undefined,
                        kr || undefined
                      );
                      return (
                        <li key={`${c.dropId}-${c.artistId}`}>
                          <Link
                            href={`/artists/${c.artistId}`}
                            className="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                          >
                            <Avatar className="h-7 w-7">
                              {img ? (
                                <AvatarImage
                                  src={getImageUrl(img, 'thumbnail')}
                                  alt={name}
                                />
                              ) : (
                                <AvatarFallback className="text-xs">
                                  {initials}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span>{name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {drop.variants.length > 0 && (
                  <div className="mt-4 inline-flex items-baseline gap-1 rounded-full bg-neutral-900 px-5 py-2 text-white">
                    <span className="text-xl font-semibold tabular-nums">
                      {Math.min(
                        ...drop.variants.map((v) => v.price)
                      ).toLocaleString()}
                    </span>
                    <span className="text-sm">
                      원{drop.variants.length > 1 && ' ~'}
                    </span>
                  </div>
                )}
              </div>

              {/* Variant Selection / Status */}
              <div className="border-b py-6">
                {!isSaleActive ? (
                  <div
                    className={cn(
                      'rounded-xl px-6 py-8 text-center',
                      isSoldOut
                        ? 'bg-red-50 text-red-600'
                        : 'bg-neutral-50 text-neutral-500'
                    )}
                  >
                    <p className="text-lg font-semibold">
                      {isSoldOut ? 'Sold Out' : '준비 중'}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                      옵션 선택
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {drop.variants.map((variant) => {
                        const varRemaining = variant.stock - variant.soldCount;
                        const isSoldOut = varRemaining <= 0;
                        const isSelected = selectedVariant === variant.id;

                        return (
                          <button
                            key={variant.id}
                            type="button"
                            className={cn(
                              'relative min-w-[120px] rounded-full px-5 py-3 text-sm font-medium transition-all duration-200',
                              isSoldOut
                                ? 'cursor-not-allowed text-neutral-400 ring-1 ring-neutral-200 before:absolute before:inset-x-3 before:top-1/2 before:h-px before:-rotate-12 before:bg-neutral-300'
                                : isSelected
                                  ? 'cursor-default bg-neutral-900 text-white ring-2 ring-neutral-900'
                                  : 'ring-1 ring-neutral-300 hover:ring-neutral-900'
                            )}
                            onClick={() => {
                              if (!isSoldOut) {
                                setSelectedVariant(variant.id);
                                setQuantity(1);
                              }
                            }}
                            disabled={isSoldOut}
                          >
                            {variant.name}
                            <span className="ml-2 tabular-nums">
                              {variant.price.toLocaleString()}원
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Quantity & Add to Cart */}
              {isSaleActive && selected && (
                <div className="border-b py-6">
                  {/* Quantity */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-600">
                      수량
                    </span>
                    <div className="flex items-center rounded-full border">
                      <button
                        type="button"
                        aria-label="수량 감소"
                        className="flex h-10 w-10 items-center justify-center text-neutral-500 transition-colors hover:text-neutral-900 disabled:opacity-30"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="수량 증가"
                        className="flex h-10 w-10 items-center justify-center text-neutral-500 transition-colors hover:text-neutral-900 disabled:opacity-30"
                        onClick={() =>
                          setQuantity((q) => Math.min(remaining, q + 1))
                        }
                        disabled={quantity >= remaining}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-right text-xs text-neutral-400">
                    잔여 {remaining}개
                  </p>

                  {/* Total */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-neutral-500">총 금액</span>
                    <span className="text-2xl font-bold tabular-nums text-neutral-900">
                      {(selected.price * quantity).toLocaleString()}원
                    </span>
                  </div>

                  {/* CTA */}
                  <GoodsPurchaseSection
                    dropId={drop.id}
                    title={drop.title}
                    variantId={selected.id}
                    variantName={selected.name}
                    unitPrice={selected.price}
                    quantity={quantity}
                  />
                </div>
              )}

              {/* Description */}
              {drop.description && (
                <div className="py-6">
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                    상세 정보
                  </h3>
                  <div
                    className="prose prose-sm prose-neutral max-w-none leading-relaxed"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: RichEditor로 생성된 신뢰 가능한 관리자 입력 HTML
                    dangerouslySetInnerHTML={{ __html: drop.description }}
                  />
                </div>
              )}

              {/* Notice */}
              {drop.notice && (
                <div className="border-t py-6">
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                    안내사항
                  </h3>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm leading-relaxed text-neutral-600">
                    <div className="prose prose-sm prose-neutral max-w-none">
                      <ReactMarkdown>{drop.notice}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MediaLightbox
        media={allMedia}
        activeIndex={lightboxOpen ? activeMediaIndex : null}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setActiveMediaIndex}
      />

      {/* 모바일 전용 하단 예매 바 — 판매중일 때만 (구매 섹션 보이면 자동 숨김) */}
      {isSaleActive && (
        <MobilePurchaseBar
          targetId="goods-purchase"
          priceLabel={`${lowestPrice.toLocaleString()}원${
            drop.variants.length > 1 ? '~' : ''
          }`}
          ctaLabel={SALES_TERMS.ctaPurchase}
        />
      )}
    </div>
  );
}
