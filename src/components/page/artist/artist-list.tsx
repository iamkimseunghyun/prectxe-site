// 아티스트 데이터 fetch 함수를 캐시로 감싸기
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { ArtistGrid } from '@/components/page/artist/artist-grid';

const getArtists = unstable_cache(
  async (searchQuery: string) => {
    return await prisma.artist.findMany({
      where: {
        OR: searchQuery
          ? [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { nameKr: { contains: searchQuery, mode: 'insensitive' } },
              { biography: { contains: searchQuery, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        images: true,
        artistArtworks: {
          include: {
            artwork: {
              include: {
                images: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },
  ['artists-list'],
  { revalidate: 60 } // 60초 동안 캐시 유지
);

const ArtistList = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
  const { search } = await searchParams;
  const searchQuery = typeof search === 'string' ? search : '';
  const artists = await getArtists(searchQuery);
  return <ArtistGrid artists={artists} />;
};

export default ArtistList;
