'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
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
  const heroImage = drop.images[0]?.imageUrl ?? drop.heroUrl;
  const availableTiers = drop.ticketTiers
    .filter((t) => t.status === 'on_sale')
    .map((t) => ({
      ...t,
      remaining: t.quantity - t.soldCount,
    }));

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section — full-width immersive */}
      <div className="relative">
        {drop.videoUrl ? (
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            <video
              src={drop.videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
          </div>
        ) : heroImage ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100 lg:aspect-[21/9]">
            <img
              src={heroImage}
              alt={drop.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
          </div>
        ) : (
          <div className="h-[40vh] bg-neutral-900" />
        )}

        {/* Overlay Title */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 lg:px-12">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-3xl font-bold text-white lg:text-5xl">
              {drop.title}
            </h1>
            {drop.summary && (
              <p className="mt-2 text-lg text-white/80 lg:text-xl">
                {drop.summary}
              </p>
            )}
          </div>
        </div>

        {/* Back button */}
        <Link
          href="/drops"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      {/* Content — single view, everything visible */}
      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Description */}
          <div className="lg:col-span-3">
            {drop.description && (
              <div className="prose prose-neutral max-w-none">
                {drop.description.split('\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}

            {/* Additional images */}
            {drop.images.length > 1 && (
              <div className="mt-8 space-y-4">
                {drop.images.slice(1).map((img) => (
                  <img
                    key={img.id}
                    src={img.imageUrl}
                    alt={img.alt}
                    className="w-full rounded-xl"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Ticket Purchase — sticky sidebar */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-6">
              {drop.status === 'closed' ? (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-10 text-center">
                  <p className="text-lg font-semibold text-neutral-500">
                    Closed
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    판매가 종료되었습니다.
                  </p>
                </div>
              ) : drop.status === 'sold_out' ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
                  <p className="text-lg font-semibold text-red-600">Sold Out</p>
                  <p className="mt-1 text-sm text-red-400">매진되었습니다.</p>
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
  );
}
