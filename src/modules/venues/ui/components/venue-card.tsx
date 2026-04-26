import { MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';

export type VenueCardData = {
  id: string;
  name: string;
  tagline: string | null;
  city: string | null;
  country: string | null;
  tags: string[];
  images: { id: string; imageUrl: string; alt: string }[];
};

interface VenueCardProps {
  venue: VenueCardData;
}

export default function VenueCard({ venue }: VenueCardProps) {
  const firstImage = venue.images[0];
  const location = [venue.city, venue.country].filter(Boolean).join(', ');
  const visibleTags = (venue.tags ?? []).slice(0, 2);

  return (
    <Link href={`/venues/${venue.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-neutral-100">
        {firstImage ? (
          <Image
            src={getImageUrl(firstImage.imageUrl, 'smaller')}
            alt={firstImage.alt || venue.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MapPin className="h-12 w-12 text-neutral-300" />
          </div>
        )}
      </div>

      <div className="mt-5 space-y-1.5">
        <h3 className="text-base font-medium leading-snug tracking-tight transition-colors group-hover:text-neutral-500 md:text-lg">
          {venue.name}
        </h3>
        {venue.tagline && (
          <p className="line-clamp-2 text-sm text-neutral-500">
            {venue.tagline}
          </p>
        )}
        {(visibleTags.length > 0 || location) && (
          <p className="pt-1 text-xs uppercase tracking-[0.15em] text-neutral-400">
            {[...visibleTags, location].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </Link>
  );
}
