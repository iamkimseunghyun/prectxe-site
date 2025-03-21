'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { getMoreArtists } from '@/app/artists/actions';
import ArtistCard from '@/components/page/artist/artist-card';
import InfiniteScroll from '@/components/page/artist/infinite-scroll';

// 기본적인 이미지 타입
interface ImageData {
  id: string;
  imageUrl: string;
  alt: string;
}

// 작품 타입
interface ArtworkData {
  id: string;
  title: string;
  description?: string | null;
  images: ImageData[];
}

// 아티스트 타입
interface ArtistData {
  id: string;
  name: string;
  nameKr?: string;
  mainImageUrl?: string | null;
  biography?: string | null;
  city?: string | null;
  country?: string | null;
  images?: ImageData[];
  artistArtworks: {
    artwork: ArtworkData;
  }[];
}

interface ArtistGridProps {
  initialArtists: ArtistData[];
}

export function ArtistGrid({ initialArtists }: ArtistGridProps) {
  const [artists, setArtists] = useState<ArtistData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(false);
  const trigger = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      async (
        entries: IntersectionObserverEntry[],
        observer: IntersectionObserver
      ) => {
        const element = entries[0];
        if (element.isIntersecting && trigger.current) {
          observer.unobserve(trigger.current);
          setIsLoading(true);
          const newArtists = await getMoreArtists(page + 1);
          if (newArtists.length !== 0) {
            setPage((prev) => prev + 1);
            setArtists((prev) => [...prev, ...newArtists]);
          } else {
            setIsLastPage(true);
          }
          setIsLoading(false);
        }
        console.log('Infinite Scrolling~~~', entries[0].isIntersecting);
      },
      {
        threshold: 1,
        rootMargin: '0px 0px -100px 0px',
      }
    );
    if (trigger.current) {
      observer.observe(trigger.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [page]);

  if (initialArtists.length === 0) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">검색 결과가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {initialArtists.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
      {!isLastPage ? (
        <div>
          <InfiniteScroll trigger={trigger} isLoading={isLoading} />
        </div>
      ) : null}
    </div>
  );
}
