'use server';

import { prisma } from '@/lib/prisma';
import { ArtistFormData } from '@/lib/validations/artist';
import { formatDate } from '@/lib/utils';

export async function getArtistById(
  artistId: string
): Promise<ArtistFormData | null> {
  try {
    const artist = await prisma.artist.findUnique({
      where: {
        id: artistId,
      },
      include: {
        galleryImageUrls: {
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!artist) return null;

    // DB 데이터를 ProjectFormData 형식으로 변환
    return {
      name: artist.name,
      mainImageUrl: artist.mainImageUrl,
      birth: formatDate(artist.birth),
      nationality: artist.nationality,
      country: artist.country,
      city: artist.city,
      email: artist.email,
      homepage: artist.homepage,
      biography: artist.biography,
      cv: artist.cv,
      galleryImageUrls: artist.galleryImageUrls.map((image, index) => ({
        imageUrl: image.imageUrl,
        alt: image.alt || `Gallery image ${index + 1}`,
        order: image.order,
      })),
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function deleteArtwork(id: string): Promise<{ delete: string }> {
  await prisma.artwork.delete({ where: { id: id } });
  return {
    delete: 'ok',
  };
}
