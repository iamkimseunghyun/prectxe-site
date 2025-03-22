// 아티스트 데이터 fetch 함수를 캐시로 감싸기
import { ArtistGrid } from '@/components/page/artist/artist-grid';
import { getArtistsPage } from '@/app/artists/actions';
import { PAGINATION } from '@/lib/constants/constants';

const ArtistList = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const { search } = await searchParams;
  const searchQuery = typeof search === 'string' ? search : '';

  // 페이지 0, 페이지 크기 10으로 초기 데이터 로드
  const initialArtists = await getArtistsPage(
    0,
    PAGINATION.ARTISTS_PAGE_SIZE,
    searchQuery
  );

  return (
    <ArtistGrid initialArtists={initialArtists} searchQuery={searchQuery} />
  );
};

export default ArtistList;
