'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

import Image from 'next/image';
import Link from 'next/link';
import { GalleryImage } from '@/lib/validations/gallery-image';
import { Venue } from '@prisma/client';
import { getImageUrl } from '@/lib/utils';

interface VenueListProps {
  initialData: {
    venues: (Venue & {
      galleryImageUrls: GalleryImage[];
    })[];
    total: number;
    page: number;
    totalPages: number;
  };
  currentPage: number;
}

const VenueList = ({ initialData, currentPage }: VenueListProps) => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {initialData.venues.map((venue) => (
          <Link href={`/venues/${venue.id}`} key={venue.id}>
            <Card className="transition-shadow hover:shadow-lg">
              <CardContent className="p-0">
                {venue.galleryImageUrls?.[0] ? (
                  <div className="relative h-48 w-full">
                    <Image
                      src={getImageUrl(
                        venue.galleryImageUrls[0].imageUrl,
                        'public'
                      )}
                      alt={venue.galleryImageUrls[0].alt}
                      fill
                      priority
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="rounded-t-lg object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-t-lg bg-gray-200">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
                <div className="p-4">
                  <h2 className="mb-2 text-xl font-semibold">{venue.name}</h2>
                  <p className="mb-4 line-clamp-2 text-gray-600">
                    {venue.description}
                  </p>
                  <div className="flex items-center text-gray-500">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span className="text-sm">{venue.address}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default VenueList;
