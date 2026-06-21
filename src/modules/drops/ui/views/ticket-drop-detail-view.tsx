'use client';

import { ArrowLeft, ChevronDown, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CloudflareStreamVideo } from '@/components/media/cloudflare-stream-video';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { SaleCountdown } from '@/components/shared/sale-countdown';
import { ShareButton } from '@/components/shared/share-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Locale } from '@/i18n/config';
import { trackViewItem } from '@/lib/analytics/gtag';
import { trackMetaViewContent } from '@/lib/analytics/meta-pixel';
import { getSalesTerms } from '@/lib/constants/sales-terms';
import {
  artistInitials,
  formatArtistName,
  formatKstEventRange,
  getImageUrl,
} from '@/lib/utils';
import {
  getDropSaleWindow,
  getEffectiveDropStatus,
  getEffectiveTierStatus,
} from '@/lib/utils/ticket-status';
import { MediaLightbox } from '@/modules/drops/ui/components/media-lightbox';
import { MobilePurchaseBar } from '@/modules/drops/ui/components/mobile-purchase-bar';
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
  media: DropMedia[];
  credits: DropCredit[];
  ticketTiers: TicketTier[];
};

export function TicketDropDetailView({ drop }: { drop: TicketDrop }) {
  const t = useTranslations('drops');
  const locale = useLocale() as Locale;
  const fmtPrice = (n: number) =>
    locale === 'en' ? `₩${n.toLocaleString()}` : `${n.toLocaleString()}원`;
  // 히어로(포스터): 첫 미디어(이미지/영상). 영상이면 autoplay muted loop 배경 재생.
  // 없으면 gradient fallback.
  const heroMedia = drop.media[0] ?? null;
  // 갤러리: 전체 미디어(히어로 포함) — 히어로 영상은 컨트롤 없이 재생되므로
  // 갤러리 카드에서 사운드/컨트롤과 함께 다시 볼 수 있게 포함.
  const galleryMedia = drop.media;

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
    trackMetaViewContent({
      id: drop.id,
      name: drop.title,
      category: 'ticket',
      price: minPrice,
    });
  }, [drop.id, drop.title, drop.ticketTiers]);

  const tiersWithStatus = drop.ticketTiers.map((t) => ({
    ...t,
    status: getEffectiveTierStatus(t),
    remaining: t.quantity - t.soldCount,
  }));
  // 가격 미리보기·티켓 개수는 실제 판매중 티어 기준
  const onSaleTiers = tiersWithStatus.filter((t) => t.status === 'on_sale');
  // 구매 섹션에 노출할 티어: 판매중 + 매진 + 판매종료 (오픈예정은 숨김).
  // 살아있는(on_sale) 티어를 맨 위로, 종료/매진은 회색으로 아래에.
  const visibleTiers = tiersWithStatus
    .filter((t) => t.status !== 'scheduled')
    .sort((a, b) => {
      if (a.status === 'on_sale' && b.status !== 'on_sale') return -1;
      if (a.status !== 'on_sale' && b.status === 'on_sale') return 1;
      return 0;
    });

  const effectiveStatus = getEffectiveDropStatus({
    type: 'ticket',
    ticketTiers: drop.ticketTiers,
  });
  const isClosed = effectiveStatus === 'closed';
  const isSoldOut = effectiveStatus === 'sold_out';
  const saleWindow = getDropSaleWindow(drop.ticketTiers);

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
          <div className="absolute inset-0 bg-linear-to-br from-neutral-900 via-neutral-800 to-neutral-900" />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-black/30 to-transparent" />

        {/* Back */}
        <Link
          href="/drops"
          className="absolute left-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white/80 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white"
          aria-label={t('dropsList')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {/* Top-right controls — 드랍 상세는 전역 헤더가 숨겨지므로 여기에 로케일 토글을 둔다 */}
        <div className="absolute right-5 top-5 z-20 flex items-center gap-2">
          <LocaleSwitcher className="flex h-11 items-center rounded-full border border-white/20 bg-black/50 px-4 text-white/80 backdrop-blur-md" />
          <ShareButton
            title={drop.title}
            text={drop.summary}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/80 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/50"
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full px-6 pb-16 pt-[60vh] sm:px-10 lg:px-20">
          <div className="mx-auto max-w-5xl">
            {/* Eyebrow */}
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
              {isClosed ? 'Closed' : isSoldOut ? 'Sold Out' : 'Now Available'}
            </p>

            {!isClosed &&
              !isSoldOut &&
              (saleWindow.saleStart || saleWindow.saleEnd) && (
                <SaleCountdown
                  tone="dark"
                  saleStartIso={saleWindow.saleStart?.toISOString() ?? null}
                  saleEndIso={saleWindow.saleEnd?.toISOString() ?? null}
                  className="mb-5"
                />
              )}

            <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {drop.title}
            </h1>

            {/* Date & Venue */}
            {(drop.eventDate || drop.venue) && (
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/60">
                {drop.eventDate && (
                  <span>
                    {formatKstEventRange(
                      new Date(drop.eventDate),
                      drop.eventEndDate ? new Date(drop.eventEndDate) : null
                    )}
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
            {onSaleTiers.length > 0 && !isClosed && !isSoldOut && (
              <div className="mt-8 flex items-center gap-4">
                <span className="text-2xl font-bold tabular-nums sm:text-3xl">
                  {fmtPrice(Math.min(...onSaleTiers.map((tier) => tier.price)))}
                  {onSaleTiers.length > 1 ? ' ~' : ''}
                </span>
                <span className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/60">
                  {t('ticketCount', { count: onSaleTiers.length })}
                </span>
              </div>
            )}

            {/* Scroll indicator */}
            <div className="mt-12 flex items-center gap-2 text-white/30">
              <div className="h-8 w-px bg-white/20" />
              <ChevronDown
                className="h-4 w-4 animate-bounce"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <div className="bg-white text-neutral-900">
        <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-20">
          <div className="grid gap-12 py-16 lg:grid-cols-9 lg:py-24">
            {/* Description + Gallery (left: 3/5) */}
            <div className="lg:col-span-5">
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
                        className="group relative aspect-4/3 overflow-hidden rounded-xl bg-neutral-100 transition-opacity hover:opacity-90"
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
                              alt={m.alt || t('videoThumb')}
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
                    {t('notice')}
                  </p>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm leading-relaxed text-neutral-600">
                    <div className="prose prose-sm prose-neutral max-w-none">
                      <ReactMarkdown>{drop.notice}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ticket Purchase (right: 2/5) */}
            <div id="ticket-purchase" className="scroll-mt-6 lg:col-span-4">
              <div className="lg:sticky lg:top-8">
                {isClosed ? (
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-12 text-center">
                    <p className="text-xl font-bold text-neutral-400">Closed</p>
                    <p className="mt-2 text-sm text-neutral-400">
                      {t('salesEnded')}
                    </p>
                  </div>
                ) : isSoldOut ? (
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
                    <p className="text-xl font-bold text-red-500">Sold Out</p>
                    <p className="mt-2 text-sm text-red-400">
                      {t('soldOutMsg')}
                    </p>
                  </div>
                ) : (
                  <TicketPurchaseSection
                    dropId={drop.id}
                    title={drop.title}
                    tiers={visibleTiers}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <MediaLightbox
        media={galleryMedia}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />

      {/* 모바일 전용 하단 예매 바 — 판매중일 때만 (종료/매진/오픈예정은 히어로·하단 카드가 안내) */}
      {effectiveStatus === 'on_sale' && onSaleTiers.length > 0 && (
        <MobilePurchaseBar
          targetId="ticket-purchase"
          priceLabel={`${fmtPrice(
            Math.min(...onSaleTiers.map((tier) => tier.price))
          )}${onSaleTiers.length > 1 ? '~' : ''}`}
          ctaLabel={getSalesTerms(locale).ctaPurchase}
        />
      )}
    </div>
  );
}
