'use server';

import { prisma } from '@/lib/prisma';

export async function getArtists(search?: string) {
  const artists = await prisma.artist.findMany({
    where: {
      OR: search
        ? [{ name: { contains: search } }, { biography: { contains: search } }]
        : undefined,
      // category: category && category !== 'all' ? category : undefined,
    },
    include: {
      _count: {
        select: { artistArtworks: true },
      },
    },
  });
  return artists;
}

export async function deleteArtist(artistId: string) {
  await prisma.artist.delete({
    where: {
      id: artistId,
    },
  });
  return {
    delete: 'ok',
  };
}
