import { unstable_cache as next_cache } from 'next/cache';
import { CACHE_TIMES, PAGINATION } from '@/lib/constants/constants';
import { prisma } from '@/lib/db/prisma';

/**
 * 읽기 전용 쿼리 모듈.
 *
 * 이전에는 이 함수들이 전부 `'use server'` 파일(actions.ts)에서 export되어
 * 불필요하게 서버 액션 RPC 엔드포인트로 노출됐다(getArtistById는 email까지
 * 반환). 서버 컴포넌트에서 직접 import하는 읽기 경로는 액션일 필요가 없다.
 * 클라이언트에서 호출되는 getMoreArtists만 actions.ts에 남는다.
 */

/** 검색어 길이 상한 — 사용자 입력이 그대로 unstable_cache 키가 되므로 */
const MAX_SEARCH_LENGTH = 50;

export function normalizeSearchQuery(raw: string | undefined | null): string {
  return (raw ?? '').trim().slice(0, MAX_SEARCH_LENGTH);
}

async function fetchArtistById(artistId: string) {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    include: {
      images: { orderBy: { order: 'asc' } },
      // 상세 페이지는 "작품이 있는가"만 필요하고, 실제 목록은
      // ArtworkListSection이 따로 조회한다. 예전에는 artwork+images 전체를
      // include해 캐시에 통째로 직렬화 저장하고 버렸다.
      _count: { select: { artistArtworks: true } },
      programCredits: {
        // draft(비공개) 프로그램이 아티스트 상세에 노출되던 문제.
        // programs 공개 목록과 동일하게 draft만 제외한다.
        where: { program: { status: { not: 'draft' } } },
        include: {
          program: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              type: true,
              startAt: true,
              endAt: true,
              heroUrl: true,
              venue: true,
              city: true,
            },
          },
        },
        orderBy: { program: { startAt: 'desc' } },
      },
    },
  });
  if (!artist) return null;

  return {
    ...artist,
    email: artist.email ?? undefined,
    city: artist.city ?? undefined,
    country: artist.country ?? undefined,
    homepage: artist.homepage ?? undefined,
    instagram: artist.instagram ?? undefined,
    soundcloud: artist.soundcloud ?? undefined,
    bandcamp: artist.bandcamp ?? undefined,
    youtube: artist.youtube ?? undefined,
    spotify: artist.spotify ?? undefined,
    tagline: artist.tagline ?? undefined,
    tags: artist.tags,
    biography: artist.biography ?? undefined,
    cv: artist.cv ?? undefined,
    mainImageUrl: artist.mainImageUrl ?? undefined,
    images: artist.images.map(({ id, imageUrl, alt, order }) => ({
      id,
      imageUrl,
      alt,
      order,
    })),
    artworkCount: artist._count.artistArtworks,
  };
}

const getArtistByIdCachedRaw = next_cache(fetchArtistById, ['artist-detail'], {
  revalidate: CACHE_TIMES.ARTIST_DETAIL,
  tags: ['artists'],
});

// 공개 상세용 — 캐시 + 편집 시 updateTag('artists')로 즉시 무효화.
// unstable_cache는 Date를 문자열로 직렬화하므로, 소비되는 program 날짜를
// Date로 복원해 타입(Date)과 런타임을 일치시킨다(소비처: ProgramCard).
export async function getArtistByIdWithCache(artistId: string) {
  const artist = await getArtistByIdCachedRaw(artistId);
  if (!artist) return null;
  return {
    ...artist,
    programCredits: artist.programCredits.map((credit) => ({
      ...credit,
      program: {
        ...credit.program,
        startAt: credit.program.startAt
          ? new Date(credit.program.startAt)
          : null,
        endAt: credit.program.endAt ? new Date(credit.program.endAt) : null,
      },
    })),
  };
}

// 어드민 편집 등 최신 데이터가 필요한 경우 — 캐시 미사용
export async function getArtistById(artistId: string) {
  return fetchArtistById(artistId);
}

/**
 * 캐시 키는 인수로 만들어지므로 정규화는 반드시 래퍼 "바깥"에서 해야 한다.
 * 캐시 함수 안에서 정규화하면 "  ryo  " / "ryo" / "ryo"+패딩이 모두 같은
 * 결과를 내면서도 각각 별개의 캐시 엔트리를 만든다(길이 상한을 둔 의미가 없음).
 */
const getArtistsPageCached = next_cache(
  async (page: number, pageSize: number, q: string) => {
    try {
      return await prisma.artist.findMany({
        where: q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { nameKr: { contains: q, mode: 'insensitive' } },
                { tagline: { contains: q, mode: 'insensitive' } },
                { city: { contains: q, mode: 'insensitive' } },
                { tags: { has: q } },
              ],
            }
          : undefined,
        select: {
          id: true,
          name: true,
          nameKr: true,
          mainImageUrl: true,
          city: true,
          country: true,
          tagline: true,
          tags: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: page * pageSize,
        take: pageSize,
      });
    } catch (error) {
      console.error('아티스트 목록 조회 오류:', error);
      throw new Error('아티스트 목록을 불러오는데 실패했습니다.');
    }
  },
  ['artists-list'],
  { revalidate: CACHE_TIMES.ARTISTS_LIST, tags: ['artists'] }
);

export async function getArtistsPage(
  page = 0,
  pageSize = PAGINATION.ARTISTS_PAGE_SIZE,
  searchQuery = ''
) {
  return getArtistsPageCached(
    page,
    pageSize,
    normalizeSearchQuery(searchQuery)
  );
}

type ArtistListItem = {
  id: string;
  name: string;
  nameKr: string;
  city: string | null;
  country: string | null;
};

export async function listArtistsPaged(
  params: { page?: number; pageSize?: number } = {}
) {
  const { page = 1, pageSize = 10 } = params;

  try {
    const [total, items] = await Promise.all([
      prisma.artist.count(),
      prisma.artist.findMany({
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          nameKr: true,
          city: true,
          country: true,
        },
      }),
    ]);

    return { page, pageSize, total, items };
  } catch (e) {
    console.error('Artists paged list error:', e);
    return { page, pageSize, total: 0, items: [] as ArtistListItem[] };
  }
}
