'use client';

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CloudflareStreamVideo } from '@/components/cloudflare-stream-video';
import { cn, getImageUrl } from '@/lib/utils';
import { GoodsPurchaseSection } from '@/modules/drops/ui/components/goods-purchase-section';

type GoodsVariant = {
  id: string;
  name: string;
  price: number;
  stock: number;
  soldCount: number;
  options: unknown;
  order: number;
};

type DropImage = {
  id: string;
  imageUrl: string;
  alt: string;
  order: number;
};

type GoodsDrop = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  heroUrl: string | null;
  videoUrl: string | null;
  status: string;
  images: DropImage[];
  variants: GoodsVariant[];
};

export function GoodsDropDetailView({ drop }: { drop: GoodsDrop }) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // 비디오가 있으면 첫 번째 미디어로, 이후 이미지
  const hasVideo = !!drop.videoUrl;
  const allImages = [
    ...(drop.heroUrl
      ? [{ id: 'hero', imageUrl: drop.heroUrl, alt: drop.title, order: -1 }]
      : []),
    ...drop.images,
  ];
  const totalMedia = (hasVideo ? 1 : 0) + allImages.length;
  // 현재 비디오를 보여줄지 여부
  const showingVideo = hasVideo && activeMediaIndex === 0;
  // 이미지 인덱스 (비디오가 있으면 1부터 시작)
  const activeImageIndex = hasVideo ? activeMediaIndex - 1 : activeMediaIndex;

  const selected = drop.variants.find((v) => v.id === selectedVariant);
  const remaining = selected ? selected.stock - selected.soldCount : 0;
  const isSaleActive = drop.status !== 'closed' && drop.status !== 'sold_out';

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b">
        <div className="mx-auto flex max-w-screen-2xl items-center px-4 py-3 sm:px-6">
          <Link
            href="/drops"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Drops</span>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
        <div className="lg:flex">
          {/* ── Image Gallery (left: 3/5) ── */}
          <div className="lg:basis-3/5 lg:border-r">
            <div className="relative py-6 lg:pr-8 lg:py-12">
              {totalMedia > 0 ? (
                <>
                  {/* Main Media */}
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
                    {showingVideo ? (
                      <CloudflareStreamVideo
                        videoUrl={drop.videoUrl!}
                        autoPlay
                        muted
                        controls
                        className="h-full w-full object-contain"
                      />
                    ) : activeImageIndex >= 0 && allImages[activeImageIndex] ? (
                      <Image
                        src={getImageUrl(
                          allImages[activeImageIndex].imageUrl,
                          'hires'
                        )}
                        alt={allImages[activeImageIndex].alt}
                        fill
                        priority
                        sizes="(min-width: 1024px) 60vw, 100vw"
                        className="object-contain"
                      />
                    ) : null}

                    {/* Prev / Next Arrows */}
                    {totalMedia > 1 && (
                      <>
                        <button
                          type="button"
                          aria-label="이전"
                          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/80 text-neutral-600 backdrop-blur-sm transition-all hover:scale-110 hover:border-white hover:bg-white"
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
                          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/80 text-neutral-600 backdrop-blur-sm transition-all hover:scale-110 hover:border-white hover:bg-white"
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
                      {hasVideo && (
                        <button
                          type="button"
                          aria-label="영상"
                          className={cn(
                            'flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border-2 transition-all',
                            activeMediaIndex === 0
                              ? 'border-neutral-900 ring-1 ring-neutral-900'
                              : 'border-transparent opacity-60 hover:opacity-100'
                          )}
                          onClick={() => setActiveMediaIndex(0)}
                        >
                          <span className="text-2xl">▶</span>
                        </button>
                      )}
                      {allImages.map((img, idx) => (
                        <button
                          key={img.id}
                          type="button"
                          aria-label={`이미지 ${idx + 1}`}
                          className={cn(
                            'relative h-20 w-20 overflow-hidden rounded-lg border-2 transition-all',
                            activeMediaIndex === (hasVideo ? idx + 1 : idx)
                              ? 'border-neutral-900 ring-1 ring-neutral-900'
                              : 'border-transparent opacity-60 hover:opacity-100'
                          )}
                          onClick={() =>
                            setActiveMediaIndex(hasVideo ? idx + 1 : idx)
                          }
                        >
                          <Image
                            src={getImageUrl(img.imageUrl, 'thumbnail')}
                            alt={img.alt}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
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
          <div className="lg:basis-2/5">
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
                      drop.status === 'sold_out'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-neutral-50 text-neutral-500'
                    )}
                  >
                    <p className="text-lg font-semibold">
                      {drop.status === 'sold_out' ? 'Sold Out' : '판매 종료'}
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
                  <div className="prose prose-sm prose-neutral max-w-none leading-relaxed">
                    {drop.description.split('\n').map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Summary */}
      {isSaleActive && selected && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900">
                {selected.name} × {quantity}
              </p>
              <p className="text-lg font-bold tabular-nums">
                {(selected.price * quantity).toLocaleString()}원
              </p>
            </div>
            <p className="text-xs text-neutral-400">↑ 위에서 구매</p>
          </div>
        </div>
      )}
    </div>
  );
}
