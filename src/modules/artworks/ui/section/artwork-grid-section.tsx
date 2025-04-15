'use client';

import { PAGINATION } from '@/lib/constants/constants';
import { getMoreArtworks } from '@/modules/artworks/server/actions';

import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { getImageUrl } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import Spinner from '@/components/icons/spinner';
import React from 'react';

type ArtworkWithImages = {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
  media: string | null;
  size: string | null;
  images: { id: string; imageUrl: string; alt: string }[];
  user: {
    id: string;
  };
  artists: {
    artist: { name: string };
  }[];
};

const ArtworkGridSection = ({
  initialArtworks,
}: {
  initialArtworks: ArtworkWithImages[];
}) => {
  const {
    items: artworks,
    isLoading,
    isLastPage,
    trigger,
  } = useInfiniteScroll({
    fetchFunction: getMoreArtworks,
    initialData: initialArtworks,
    pageSize: PAGINATION.ARTWORKS_PAGE_SIZE,
  });

  if (artworks.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-gray-500">등록된 작품이 없습니다.</p>
      </div>
    );
  }

  if (initialArtworks.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-gray-500">등록된 작품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {artworks.map((artwork) => (
        <Link key={artwork.id} href={`/artworks/${artwork.id}`}>
          <Card className="overflow-hidden transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="line-clamp-1">{artwork.title}</CardTitle>
            </CardHeader>

            <CardContent>
              {artwork.images[0] && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                  <Image
                    src={getImageUrl(`${artwork.images[0].imageUrl}`, 'public')}
                    alt={artwork.images[0].alt}
                    fill
                    priority
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
                    className="object-cover"
                  />
                </div>
              )}

              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-500">
                  {artwork.year}년 | {artwork.media}
                </p>
                <p className="text-sm text-gray-500">크기: {artwork.size}</p>
                <p className="line-clamp-2 text-sm">{artwork.description}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
      {!isLastPage && (
        <span ref={trigger} className="mx-auto">
          {isLoading ? <Spinner /> : '더 보기'}
        </span>
      )}
    </div>
  );
};

export default ArtworkGridSection;
