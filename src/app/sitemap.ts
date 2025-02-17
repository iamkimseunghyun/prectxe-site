// src/app/sitemap.ts
import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 기본 URL
  const baseUrl = 'https://prectxe.com';

  // DB에서 동적 라우트 데이터 가져오기
  const artists = await prisma.artist.findMany({
    select: { id: true, updatedAt: true },
  });

  const events = await prisma.event.findMany({
    select: { id: true, updatedAt: true },
  });

  const artworks = await prisma.artwork.findMany({
    select: { id: true, updatedAt: true },
  });

  const projects = await prisma.project.findMany({
    select: { id: true, updatedAt: true },
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
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      priority: 0.7,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      priority: 0.8,
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
      url: `${baseUrl}/projects`,
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

  // 동적 라우트 - 이벤트
  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${baseUrl}/events/${event.id}`,
    lastModified: event.updatedAt,
    priority: 0.7,
  }));

  // 동적 라우트 - 작품
  const artworkRoutes: MetadataRoute.Sitemap = artworks.map((artwork) => ({
    url: `${baseUrl}/artworks/${artwork.id}`,
    lastModified: artwork.updatedAt,
    priority: 0.5,
  }));

  // 동적 라우트 - 프로젝트
  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${baseUrl}/projects/${project.id}`,
    lastModified: project.updatedAt,
    priority: 0.6,
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
    ...eventRoutes,
    ...artworkRoutes,
    ...projectRoutes,
    ...venueRoutes,
  ];
}
