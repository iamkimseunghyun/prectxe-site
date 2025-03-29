'use client';

import { getMoreArtists } from '@/app/(page)/artists/actions';
import ArtistCard from '@/components/page/artist/artist-card';
import InfiniteScroll from '@/components/page/artist/infinite-scroll';
import { PAGINATION } from '@/lib/constants/constants';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';

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
  const {
    items: artists,
    isLoading,
    isLastPage,
    trigger,
  } = useInfiniteScroll<ArtistData>({
    fetchFunction: getMoreArtists,
    initialData: initialArtists,
    searchQuery,
    pageSize: PAGINATION.ARTISTS_PAGE_SIZE, // 페이지 크기 명시적으로 전달
  });

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
