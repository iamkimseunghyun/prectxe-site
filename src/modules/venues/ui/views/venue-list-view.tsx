'use client';

import { ImageIcon, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { getImageUrl } from '@/lib/utils';

interface VenueItem {
  id: string;
  name: string;
  description: string;
  address: string;
  images: { id: string; imageUrl: string; alt: string }[];
}

interface VenueListProps {
  initialData: {
    items: VenueItem[];
    total: number;
    pageSize: number;
  };
}

const VenueList = ({ initialData }: VenueListProps) => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {initialData.items.map((venue) => (
        <Link href={`/venues/${venue.id}`} key={venue.id}>
          <Card className="overflow-hidden transition-shadow hover:shadow-lg">
            <CardContent className="p-0">
              {venue.images[0] ? (
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    src={getImageUrl(venue.images[0].imageUrl, 'smaller')}
                    alt={venue.images[0].alt || venue.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="rounded-t-lg object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-t-lg bg-muted">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
              <div className="p-4">
                <h2 className="mb-2 text-xl font-semibold">{venue.name}</h2>
                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                  {venue.description}
                </p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {venue.address}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default VenueList;
