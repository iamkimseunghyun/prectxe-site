import { MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CarouselGallery from '@/components/image/carousel-gallery';
import BreadcrumbNav from '@/components/layout/nav/breadcrum-nav';
import VenueSchema from '@/components/seo/venue-schema';
import { getVenueById } from '@/modules/venues/server/actions';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const venue = await getVenueById(id);

  if (!venue) {
    return { title: 'Venue Not Found' };
  }

  const description = venue.description?.slice(0, 160) || venue.name;

  return {
    title: venue.name,
    description,
    alternates: { canonical: `https://prectxe.com/venues/${id}` },
    openGraph: {
      title: venue.name,
      description,
      images: venue.images[0]
        ? [{ url: venue.images[0].imageUrl, alt: venue.images[0].alt }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: venue.name,
      description,
      images: venue.images[0] ? [venue.images[0].imageUrl] : undefined,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const venue = await getVenueById(id);

  if (!venue) notFound();

  const hasImages = venue.images.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <VenueSchema
        venue={{
          id: venue.id,
          name: venue.name,
          address: venue.address,
          images: venue.images,
        }}
      />
      <BreadcrumbNav entityType="venue" title={venue.name} />

      {/* Gallery */}
      {hasImages && (
        <section className="mb-10">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg">
            <CarouselGallery images={venue.images} />
          </div>
        </section>
      )}

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{venue.name}</h1>
        <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {venue.address}
        </div>
      </header>

      {/* About */}
      {venue.description && (
        <section className="border-t pt-8 pb-2">
          <h2 className="mb-4 text-lg font-semibold">About</h2>
          <div className="prose max-w-none whitespace-pre-line text-muted-foreground">
            {venue.description}
          </div>
        </section>
      )}
    </div>
  );
}
