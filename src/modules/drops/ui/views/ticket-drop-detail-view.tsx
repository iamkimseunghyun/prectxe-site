'use client';

import { ArrowLeft, ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CloudflareStreamVideo } from '@/components/cloudflare-stream-video';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trackViewItem } from '@/lib/analytics/gtag';
import { artistInitials, formatArtistName, getImageUrl } from '@/lib/utils';
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

type TicketDrop = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  eventDate: Date | null;
  eventEndDate: Date | null;
  venue: string | null;
  venueAddress: string | null;
  notice: string | null;
  status: string;
  media: DropMedia[];
  credits: DropCredit[];
  ticketTiers: TicketTier[];
};

export function TicketDropDetailView({ drop }: { drop: TicketDrop }) {
  // 히어로(포스터): 첫 미디어(이미지/영상). 영상이면 autoplay muted loop 배경 재생.
  // 없으면 gradient fallback.
  const heroMedia = drop.media[0] ?? null;
  // 갤러리: 전체 미디어(히어로 포함) — 히어로 영상은 컨트롤 없이 재생되므로
  // 갤러리 카드에서 사운드/컨트롤과 함께 다시 볼 수 있게 포함.
  const galleryMedia = drop.media;

  // 라이트박스는 이미지·영상 모두 지원
  const lightboxMedia = galleryMedia;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const activeLightboxMedia =
    lightboxIndex !== null ? lightboxMedia[lightboxIndex] : null;

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
  const prevMedia = useCallback(
    () =>
      setLightboxIndex((i) =>
        i !== null
          ? (i - 1 + lightboxMedia.length) % lightboxMedia.length
          : null
      ),
    [lightboxMedia.length]
  );
  const nextMedia = useCallback(
    () =>
      setLightboxIndex((i) =>
        i !== null ? (i + 1) % lightboxMedia.length : null
      ),
    [lightboxMedia.length]
  );

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevMedia();
      if (e.key === 'ArrowRight') nextMedia();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, closeLightbox, prevMedia, nextMedia]);
  const availableTiers = drop.ticketTiers
    .filter((t) => getEffectiveTierStatus(t) === 'on_sale')
    .map((t) => ({
      ...t,
      remaining: t.quantity - t.soldCount,
    }));

  const isClosed = drop.status === 'closed';
  const isSoldOut = drop.status === 'sold_out';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Immersive Hero ── */}
      <section className="relative flex min-h-screen items-end">
        {/* Background Media — 이미지/영상 모두 지원 (영상은 muted autoplay loop) */}
        {heroMedia?.type === 'image' ? (
          <Image
            src={getImageUrl(heroMedia.url, 'hires')}
            alt={drop.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : heroMedia?.type === 'video' ? (
          <CloudflareStreamVideo
            videoUrl={heroMedia.url}
            autoPlay
            muted
            loop
            controls={false}
            className="absolute inset-0 h-full w-full object-cover"
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

            {drop.credits?.length ? (
              <ul className="mt-6 flex flex-wrap gap-3">
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
                        className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Avatar className="h-6 w-6">
                          {img ? (
                            <AvatarImage
                              src={getImageUrl(img, 'thumbnail')}
                              alt={name}
                            />
                          ) : (
                            <AvatarFallback className="bg-white/10 text-[10px] text-white">
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

              {/* Media Gallery (이미지 + 영상 통합) */}
              {galleryMedia.length > 0 && (
                <div className={`space-y-4 ${drop.description ? 'mt-16' : ''}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                    Media
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {galleryMedia.map((m, idx) => (
                      <button
                        key={m.id}
                        type="button"
                        className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100 transition-opacity hover:opacity-90"
                        onClick={() => setLightboxIndex(idx)}
                      >
                        {m.type === 'image' ? (
                          <Image
                            src={getImageUrl(m.url, 'public')}
                            alt={m.alt}
                            fill
                            sizes="(min-width: 640px) 50vw, 100vw"
                            className="object-cover"
                          />
                        ) : (
                          <>
                            {/* Cloudflare Stream 자동 생성 썸네일 */}
                            {/** biome-ignore lint/performance/noImgElement: Cloudflare Stream 썸네일은 next/image 원격 패턴 외부 */}
                            <img
                              src={`${m.url}/thumbnails/thumbnail.jpg?time=2s&height=600`}
                              alt={m.alt || '영상 썸네일'}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
                              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-lg transition-transform group-hover:scale-110">
                                <Play className="ml-0.5 h-6 w-6 fill-current" />
                              </div>
                            </div>
                          </>
                        )}
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
      {activeLightboxMedia && (
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
          {lightboxMedia.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevMedia();
              }}
              className="absolute left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="이전"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Media */}
          <div
            className="relative flex h-[85vh] w-[90vw] items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {activeLightboxMedia.type === 'image' ? (
              <Image
                src={getImageUrl(activeLightboxMedia.url, 'hires')}
                alt={activeLightboxMedia.alt}
                width={1200}
                height={900}
                className="h-auto max-h-full w-auto max-w-full rounded-lg object-contain"
              />
            ) : (
              // URL 변경 시 컴포넌트가 재마운트되어 이전 영상은 자동 정지됨.
              // h-full w-full object-contain → 컨테이너를 채우고 원본 비율 유지
              <CloudflareStreamVideo
                key={activeLightboxMedia.id}
                videoUrl={activeLightboxMedia.url}
                autoPlay
                controls
                className="h-full w-full rounded-lg object-contain"
              />
            )}
          </div>

          {/* Counter */}
          {lightboxMedia.length > 1 && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/60">
              {lightboxIndex! + 1} / {lightboxMedia.length}
            </p>
          )}

          {/* Next */}
          {lightboxMedia.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextMedia();
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
