'use client';

import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CloudflareStreamVideo } from '@/components/cloudflare-stream-video';
import { trackViewItem } from '@/lib/analytics/gtag';
import { getImageUrl } from '@/lib/utils';
import { getEffectiveTierStatus } from '@/lib/utils/ticket-status';
import { TicketPurchaseSection } from '@/modules/tickets/ui/components/ticket-purchase-section';

type TicketTier = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  soldCount: number;
  maxPerOrder: number;
  saleStart: Date | null;
  saleEnd: Date | null;
  status: string;
};

type DropImage = {
  id: string;
  imageUrl: string;
  alt: string;
  order: number;
};

type TicketDrop = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  heroUrl: string | null;
  videoUrl: string | null;
  eventDate: Date | null;
  eventEndDate: Date | null;
  venue: string | null;
  venueAddress: string | null;
  notice: string | null;
  status: string;
  images: DropImage[];
  ticketTiers: TicketTier[];
};

export function TicketDropDetailView({ drop }: { drop: TicketDrop }) {
  const heroImage = drop.heroUrl || drop.images[0]?.imageUrl || null;
  const galleryImages = drop.heroUrl ? drop.images : drop.images.slice(1);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const minPrice = drop.ticketTiers.length
      ? Math.min(...drop.ticketTiers.map((t) => t.price))
      : 0;
    trackViewItem({
      id: drop.id,
      name: drop.title,
      category: 'ticket',
      price: minPrice,
    });
  }, [drop.id, drop.title, drop.ticketTiers]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevImage = useCallback(
    () =>
      setLightboxIndex((i) =>
        i !== null
          ? (i - 1 + galleryImages.length) % galleryImages.length
          : null
      ),
    [galleryImages.length]
  );
  const nextImage = useCallback(
    () =>
      setLightboxIndex((i) =>
        i !== null ? (i + 1) % galleryImages.length : null
      ),
    [galleryImages.length]
  );

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, closeLightbox, prevImage, nextImage]);
  const availableTiers = drop.ticketTiers
    .filter((t) => getEffectiveTierStatus(t) === 'on_sale')
    .map((t) => ({
      ...t,
      remaining: t.quantity - t.soldCount,
    }));

  const isClosed = drop.status === 'closed';
  const isSoldOut = drop.status === 'sold_out';

  const [videoLoadFailed, setVideoLoadFailed] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Immersive Hero ── */}
      <section className="relative flex min-h-screen items-end">
        {/* Background Media */}
        {drop.videoUrl ? (
          <CloudflareStreamVideo
            videoUrl={drop.videoUrl}
            autoPlay
            loop
            muted
            controls={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        ) : heroImage ? (
          <Image
            src={getImageUrl(heroImage, 'hires')}
            alt={drop.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900" />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

        {/* Back */}
        <Link
          href="/drops"
          className="absolute left-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white/80 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white"
          aria-label="Drops 목록"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {/* Hero Content */}
        <div className="relative z-10 w-full px-6 pb-16 pt-[60vh] sm:px-10 lg:px-20">
          <div className="mx-auto max-w-5xl">
            {/* Eyebrow */}
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
              {isClosed ? 'Closed' : isSoldOut ? 'Sold Out' : 'Now Available'}
            </p>

            <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {drop.title}
            </h1>

            {/* Date & Venue */}
            {(drop.eventDate || drop.venue) && (
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/60">
                {drop.eventDate && (
                  <span>
                    {new Date(drop.eventDate).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {drop.eventEndDate &&
                      ` ~ ${new Date(drop.eventEndDate).toLocaleString(
                        'ko-KR',
                        {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}`}
                  </span>
                )}
                {drop.venue && (
                  <span>
                    {drop.venue}
                    {drop.venueAddress && ` · ${drop.venueAddress}`}
                  </span>
                )}
              </div>
            )}

            {drop.summary && (
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
                {drop.summary}
              </p>
            )}

            {/* Price preview */}
            {availableTiers.length > 0 && !isClosed && !isSoldOut && (
              <div className="mt-8 flex items-center gap-4">
                <span className="text-2xl font-bold tabular-nums sm:text-3xl">
                  {Math.min(
                    ...availableTiers.map((t) => t.price)
                  ).toLocaleString()}
                  원{availableTiers.length > 1 ? ' ~' : ''}
                </span>
                <span className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/60">
                  {availableTiers.length}개 티켓
                </span>
              </div>
            )}

            {/* Scroll indicator */}
            <div className="mt-12 flex items-center gap-2 text-xs text-white/30">
              <div className="h-8 w-px bg-white/20" />
              <span className="uppercase tracking-widest">Scroll</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <div className="bg-white text-neutral-900">
        <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-20">
          <div className="grid gap-12 py-16 lg:grid-cols-5 lg:py-24">
            {/* Description + Gallery (left: 3/5) */}
            <div className="lg:col-span-3">
              {drop.description && (
                <div
                  className="prose prose-lg prose-neutral max-w-none leading-[1.9]"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: RichEditor로 생성된 신뢰 가능한 관리자 입력 HTML
                  dangerouslySetInnerHTML={{ __html: drop.description }}
                />
              )}

              {/* Video */}
              {drop.videoUrl && !videoLoadFailed && (
                <div className={drop.description ? 'mt-16' : ''}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                    Video
                  </p>
                  <div className="relative mt-4 aspect-video overflow-hidden rounded-xl bg-neutral-100">
                    <CloudflareStreamVideo
                      videoUrl={drop.videoUrl}
                      controls
                      className="h-full w-full"
                      onError={() => setVideoLoadFailed(true)}
                    />
                  </div>
                </div>
              )}

              {/* Gallery */}
              {galleryImages.length > 0 && (
                <div className="mt-16 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                    Gallery
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={img.id}
                        type="button"
                        className="relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100 transition-opacity hover:opacity-90"
                        onClick={() => setLightboxIndex(idx)}
                      >
                        <Image
                          src={getImageUrl(img.imageUrl, 'public')}
                          alt={img.alt}
                          fill
                          sizes="(min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notice */}
              {drop.notice && (
                <div className="mt-16 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                    안내사항
                  </p>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm leading-relaxed text-neutral-600">
                    {drop.notice.split('\n').map((line, i) => (
                      <p key={i} className={i > 0 ? 'mt-2' : ''}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ticket Purchase (right: 2/5) */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-8">
                {isClosed ? (
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-12 text-center">
                    <p className="text-xl font-bold text-neutral-400">Closed</p>
                    <p className="mt-2 text-sm text-neutral-400">
                      판매가 종료되었습니다.
                    </p>
                  </div>
                ) : isSoldOut ? (
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
                    <p className="text-xl font-bold text-red-500">Sold Out</p>
                    <p className="mt-2 text-sm text-red-400">매진되었습니다.</p>
                  </div>
                ) : (
                  <TicketPurchaseSection
                    dropId={drop.id}
                    title={drop.title}
                    tiers={availableTiers}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && galleryImages[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Prev */}
          {galleryImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="이전"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-h-[85vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={getImageUrl(galleryImages[lightboxIndex].imageUrl, 'hires')}
              alt={galleryImages[lightboxIndex].alt}
              width={1200}
              height={900}
              className="max-h-[85vh] w-auto rounded-lg object-contain"
            />
            {/* Counter */}
            <p className="mt-3 text-center text-sm text-white/50">
              {lightboxIndex + 1} / {galleryImages.length}
            </p>
          </div>

          {/* Next */}
          {galleryImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="다음"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
