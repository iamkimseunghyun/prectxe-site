// src/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 기본 URL
  const baseUrl = 'https://prectxe.com';

  // DB에서 동적 라우트 데이터 가져오기
  const artists = await prisma.artist.findMany({
    select: { id: true, updatedAt: true },
  });

  const artworks = await prisma.artwork.findMany({
    select: { id: true, updatedAt: true },
  });

  // Legacy routes (events/projects) are deprecated; omit from sitemap

  const programs = await prisma.program.findMany({
    select: { slug: true, updatedAt: true },
  });

  const venues = await prisma.venue.findMany({
    select: { id: true, updatedAt: true },
  });

  // 정적 라우트
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      priority: 1,
    },
    {
      url: `${baseUrl}/programs`,
      lastModified: new Date(),
      priority: 0.9,
    },
    {
      url: `${baseUrl}/journal`,
      lastModified: new Date(),
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      priority: 0.7,
    },
    {
      url: `${baseUrl}/artists`,
      lastModified: new Date(),
      priority: 0.8,
    },
    {
      url: `${baseUrl}/artworks`,
      lastModified: new Date(),
      priority: 0.8,
    },
    {
      url: `${baseUrl}/venues`,
      lastModified: new Date(),
      priority: 0.8,
    },
  ];

  // 동적 라우트 - 아티스트
  const artistRoutes: MetadataRoute.Sitemap = artists.map((artist) => ({
    url: `${baseUrl}/artists/${artist.id}`,
    lastModified: artist.updatedAt,
    priority: 0.6,
  }));

  // 동적 라우트 - 작품
  const artworkRoutes: MetadataRoute.Sitemap = artworks.map((artwork) => ({
    url: `${baseUrl}/artworks/${artwork.id}`,
    lastModified: artwork.updatedAt,
    priority: 0.5,
  }));

  // 동적 라우트 - 프로그램
  const programRoutes: MetadataRoute.Sitemap = programs.map((p) => ({
    url: `${baseUrl}/programs/${p.slug}`,
    lastModified: p.updatedAt,
    priority: 0.8,
  }));

  // 동적 라우트 - 베뉴
  const venueRoutes: MetadataRoute.Sitemap = venues.map((venue) => ({
    url: `${baseUrl}/venues/${venue.id}`,
    lastModified: venue.updatedAt,
    priority: 0.5,
  }));

  return [
    ...staticRoutes,
    ...artistRoutes,
    ...artworkRoutes,
    ...programRoutes,
    ...venueRoutes,
  ];
}
