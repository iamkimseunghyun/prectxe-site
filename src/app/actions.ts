'use server';

import { getImageUrl } from '@/lib/utils';
import { prisma } from '@/lib/db/prisma';

type SearchResult = {
  id: string;
  title: string;
  type: 'artist' | 'artwork' | 'event' | 'project' | 'venue';
  subtype?: string;
  imageUrl?: string | null;
  description?: string | null;
  url: string;
};

/**
 * 전역 검색 기능을 위한 서버 액션
 * 아티스트, 작품, 이벤트, 프로젝트, 장소를 검색합니다.
 */
export async function globalSearch(
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    // 병렬로 여러 타입의 데이터 검색
    const [artists, artworks, events, projects, venues] = await Promise.all([
      // 아티스트 검색
      prisma.artist.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { nameKr: { contains: query, mode: 'insensitive' } },
            { biography: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          nameKr: true,
          mainImageUrl: true,
          biography: true,
        },
        take: limit,
      }),

      // 작품 검색
      prisma.artwork.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          images: {
            select: {
              imageUrl: true,
            },
            take: 1,
          },
        },
        take: limit,
      }),

      // 이벤트 검색
      prisma.event.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { subtitle: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          subtitle: true,
          description: true,
          mainImageUrl: true,
        },
        take: limit,
      }),

      // 프로젝트 검색
      prisma.project.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { about: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          about: true,
          mainImageUrl: true,
        },
        take: limit,
      }),

      // 장소 검색
      prisma.venue.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { address: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          images: {
            select: {
              imageUrl: true,
            },
            take: 1,
          },
        },
        take: limit,
      }),
    ]);

    // 검색 결과 병합 및 변환
    const results: SearchResult[] = [
      // Artist results
      ...artists.map((artist) => ({
        id: artist.id,
        title: artist.nameKr
          ? `${artist.nameKr} (${artist.name})`
          : artist.name,
        type: 'artist' as const,
        imageUrl: artist.mainImageUrl,
        description: artist.biography?.substring(0, 100) || null,
        url: `/artists/${artist.id}`,
      })),

      // Artwork results
      ...artworks.map((artwork) => ({
        id: artwork.id,
        title: artwork.title,
        type: 'artwork' as const,
        imageUrl: artwork.images[0]?.imageUrl || null,
        description: artwork.description?.substring(0, 100) || null,
        url: `/artworks/${artwork.id}`,
      })),

      // Event results
      ...events.map((event) => ({
        id: event.id,
        title: event.title,
        type: 'event' as const,
        imageUrl: event.mainImageUrl,
        description:
          event.subtitle || event.description?.substring(0, 100) || null,
        url: `/events/${event.id}`,
      })),

      // Project results
      ...projects.map((project) => ({
        id: project.id,
        title: project.title,
        type: 'project' as const,
        imageUrl: project.mainImageUrl,
        description: project.about?.substring(0, 100) || null,
        url: `/projects/${project.id}`,
      })),

      // Venue results
      ...venues.map((venue) => ({
        id: venue.id,
        title: venue.name,
        type: 'venue' as const,
        imageUrl: venue.images[0]?.imageUrl || null,
        description:
          venue.address || venue.description?.substring(0, 100) || null,
        url: `/venues/${venue.id}`,
      })),
    ];

    // 결과 개수 제한 및 반환
    return results.slice(0, limit);
  } catch (error) {
    console.error('Global search error:', error);
    return [];
  }
}
