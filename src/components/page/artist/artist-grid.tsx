'use client';

import { useEffect, useRef, useState } from 'react';
import { getMoreArtists } from '@/app/artists/actions';
import ArtistCard from '@/components/page/artist/artist-card';
import InfiniteScroll from '@/components/page/artist/infinite-scroll';
import { PAGINATION } from '@/lib/constants/constants';

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
  searchQuery?: string;
}

export function ArtistGrid({
  initialArtists,
  searchQuery = '',
}: ArtistGridProps) {
  const [artists, setArtists] = useState<ArtistData[]>(initialArtists);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1); // Start with page 1 since initialArtists is page 0
  const [isLastPage, setIsLastPage] = useState(false);
  const trigger = useRef<HTMLSpanElement>(null);

  // Keep track of artist IDs to prevent duplicates
  const artistIdsRef = useRef(
    new Set(initialArtists.map((artist) => artist.id))
  );

  useEffect(() => {
    // Reset when initialArtists changes (e.g., when search query changes)
    setArtists(initialArtists);
    artistIdsRef.current = new Set(initialArtists.map((artist) => artist.id));
    setPage(1);
    setIsLastPage(false);
  }, [initialArtists]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      async (
        entries: IntersectionObserverEntry[],
        observer: IntersectionObserver
      ) => {
        const element = entries[0];
        if (
          element.isIntersecting &&
          trigger.current &&
          !isLoading &&
          !isLastPage
        ) {
          observer.unobserve(trigger.current);
          setIsLoading(true);

          try {
            const newArtists = await getMoreArtists(page, searchQuery);

            // Filter  out duplicates
            const uniqueNewArtists = newArtists.filter(
              (artist) => !artistIdsRef.current.has(artist.id)
            );

            if (uniqueNewArtists.length > 0) {
              // Add new artist IDs to the Set
              uniqueNewArtists.forEach((artist) =>
                artistIdsRef.current.add(artist.id)
              );

              setPage((prev) => prev + 1);
              setArtists((prev) => [...prev, ...uniqueNewArtists]);
            } else {
              setIsLastPage(true);
            }

            // If we received fewer items than requested, we've reached the end
            if (newArtists.length < PAGINATION.ARTISTS_PAGE_SIZE) {
              setIsLastPage(true);
            }
          } catch (error) {
            console.error('아티스트 목록 불러오기 오류:', error);
          } finally {
            setIsLoading(false);
          }
        }
      },
      {
        threshold: 0.5,
        rootMargin: '0px 0px 200px 0px', // 부드러운 경험을 위해 더 일찍 로드
      }
    );
    if (trigger.current && !isLastPage) {
      observer.observe(trigger.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [page, isLoading, isLastPage]);

  if (artists.length === 0) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">검색 결과가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {artists.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
      {!isLastPage && (
        <div>
          <InfiniteScroll trigger={trigger} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
