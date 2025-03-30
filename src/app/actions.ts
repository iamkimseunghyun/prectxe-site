'use server';

import { prisma } from '@/lib/db/prisma';

interface SearchResult {
  id: string;
  title: string;
  type: 'artist' | 'artwork' | 'event' | 'project' | 'venue';
  subtype?: string;
  imageUrl?: string | null;
  description?: string | null;
  url: string;
}

export async function globalSearch(
  query: string,
  limit: number = 20
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmedQuery = query.trim();
  const results: SearchResult[] = [];

  try {
    // Start all search queries in parallel
    const [artists, artworks, events, projects, venues] = await Promise.all([
      // Search artists
      prisma.artist.findMany({
        where: {
          OR: [
            { name: { contains: trimmedQuery, mode: 'insensitive' } },
            { nameKr: { contains: trimmedQuery, mode: 'insensitive' } },
            { biography: { contains: trimmedQuery, mode: 'insensitive' } },
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

      // Search artworks
      prisma.artwork.findMany({
        where: {
          OR: [
            { title: { contains: trimmedQuery, mode: 'insensitive' } },
            { description: { contains: trimmedQuery, mode: 'insensitive' } },
            { style: { contains: trimmedQuery, mode: 'insensitive' } },
            { media: { contains: trimmedQuery, mode: 'insensitive' } },
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
          style: true,
        },
        take: limit,
      }),

      // Search  events
      prisma.event.findMany({
        where: {
          OR: [
            { title: { contains: trimmedQuery, mode: 'insensitive' } },
            { subtitle: { contains: trimmedQuery, mode: 'insensitive' } },
            { description: { contains: trimmedQuery, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          subtitle: true,
          description: true,
          mainImageUrl: true,
          type: true,
        },
        take: limit,
      }),

      // Search projects
      prisma.project.findMany({
        where: {
          OR: [
            { title: { contains: trimmedQuery, mode: 'insensitive' } },
            { about: { contains: trimmedQuery, mode: 'insensitive' } },
            { description: { contains: trimmedQuery, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          about: true,
          mainImageUrl: true,
          category: true,
        },
        take: limit,
      }),

      // Search venues
      prisma.venue.findMany({
        where: {
          OR: [
            { name: { contains: trimmedQuery, mode: 'insensitive' } },
            { description: { contains: trimmedQuery, mode: 'insensitive' } },
            { address: { contains: trimmedQuery, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
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
    ]);

    // Process artists
    artists.forEach((artist) => {
      results.push({
        id: artist.id,
        title: artist.nameKr
          ? `${artist.nameKr} (${artist.name})`
          : artist.name,
        type: 'artist',
        imageUrl: artist.mainImageUrl,
        description: artist.biography?.substring(0, 120) || null,
        url: `/artists/${artist.id}`,
      });
    });

    // Process artworks
    artworks.forEach((artwork) => {
      results.push({
        id: artwork.id,
        title: artwork.title,
        type: 'artwork',
        subtype: artwork.style || undefined,
        imageUrl: artwork.images[0]?.imageUrl || null,
        description: artwork.description?.substring(0, 120) || null,
        url: `/artworks/${artwork.id}`,
      });
    });

    // Process events
    events.forEach((event) => {
      results.push({
        id: event.id,
        title: event.title,
        type: 'event',
        subtype: event.type,
        imageUrl: event.mainImageUrl,
        description:
          event.subtitle || event.description?.substring(0, 120) || null,
        url: `/events/${event.id}`,
      });
    });

    // Process projects
    projects.forEach((project) => {
      results.push({
        id: project.id,
        title: project.title,
        type: 'project',
        subtype: project.category,
        imageUrl: project.mainImageUrl,
        description: project.about?.substring(0, 120) || null,
        url: `/projects/${project.id}`,
      });
    });

    // Process venues
    venues.forEach((venue) => {
      results.push({
        id: venue.id,
        title: venue.name,
        type: 'venue',
        imageUrl: venue.images[0]?.imageUrl || null,
        description: venue.description?.substring(0, 120) || null,
        url: `/venues/${venue.id}`,
      });
    });
    // Sort results by relevance (this is a simple implementation)
    // You could implement more sophisticated ranking based on your needs
    return results;
  } catch (error) {
    console.error('Global search error:', error);
    return [];
  }
}
