'use client';

import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';
import { TicketPurchaseSection } from '@/modules/tickets/ui/components/ticket-purchase-section';

type TicketTier = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  soldCount: number;
  maxPerOrder: number;
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
  status: string;
  images: DropImage[];
  ticketTiers: TicketTier[];
};

export function TicketDropDetailView({ drop }: { drop: TicketDrop }) {
  const heroImage = drop.heroUrl || drop.images[0]?.imageUrl || null;
  const galleryImages = drop.heroUrl ? drop.images : drop.images.slice(1);
  const availableTiers = drop.ticketTiers
    .filter((t) => t.status === 'on_sale')
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
        {/* Background Media */}
        {drop.videoUrl ? (
          <video
            src={drop.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
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

            {drop.summary && (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
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
                <div className="prose prose-lg prose-neutral max-w-none leading-[1.9]">
                  {drop.description.split('\n').map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}

              {/* Gallery */}
              {galleryImages.length > 0 && (
                <div className="mt-16 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                    Gallery
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {galleryImages.map((img) => (
                      <div
                        key={img.id}
                        className="relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100"
                      >
                        <Image
                          src={getImageUrl(img.imageUrl, 'public')}
                          alt={img.alt}
                          fill
                          sizes="(min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
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

      {/* ── Footer ── */}
      <footer className="border-t border-neutral-200 bg-white py-10">
        <nav className="flex items-center justify-center gap-6 text-sm">
          <Link
            href="/"
            className="text-neutral-400 transition-colors hover:text-neutral-900"
          >
            Home
          </Link>
          <Link
            href="/drops"
            className="text-neutral-400 transition-colors hover:text-neutral-900"
          >
            Drops
          </Link>
          <Link
            href="/programs"
            className="text-neutral-400 transition-colors hover:text-neutral-900"
          >
            Archive
          </Link>
          <Link
            href="/about"
            className="text-neutral-400 transition-colors hover:text-neutral-900"
          >
            About
          </Link>
        </nav>
      </footer>
    </div>
  );
}
