'use server';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getArtist(id: string) {
  try {
    const artist = await prisma.artist.findUnique({
      where: { id },
      include: {
        artistArtworks: {
          include: {
            artwork: {
              include: {
                galleryImageUrls: true,
              },
            },
          },
        }, // 작품 목록

        //events: true,   // 이벤트 목록
      },
    });

    if (!artist) {
      return {
        success: false,
        error: { message: '아티스트를 찾을 수 없습니다.' },
      };
    }

    return {
      success: true,
      data: artist,
    };
  } catch (error) {
    console.error('Error fetching artist:', error);
    return {
      success: false,
      error: { message: '아티스트 정보를 가져오는데 실패했습니다.' },
    };
  }
}
