import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export async function getArtworkById(id: string): Promise<any> {
  const artwork = await prisma.artwork.findUnique({
    where: { id },
    include: {
      galleryImageUrls: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  if (!artwork) notFound();

  return artwork;
}
