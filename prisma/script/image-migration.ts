import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

//npx ts-node --transpile-only prisma/script/image-migration.ts

async function migrateImages() {
  // Project Images
  const projectImages = await prisma.galleryImageUrl.findMany({
    where: {
      projectId: { not: null },
    },
  });

  for (const img of projectImages) {
    await prisma.projectImage.create({
      data: {
        imageUrl: img.imageUrl,
        alt: img.alt,
        order: img.order,
        projectId: img.projectId!,
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
      },
    });
  }

  // Artist Images
  const artistImages = await prisma.galleryImageUrl.findMany({
    where: {
      artistId: { not: null },
    },
  });

  for (const img of artistImages) {
    await prisma.artistImage.create({
      data: {
        imageUrl: img.imageUrl,
        alt: img.alt,
        order: img.order,
        artistId: img.artistId!,
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
      },
    });
  }

  // Artwork Images
  const artworkImages = await prisma.galleryImageUrl.findMany({
    where: {
      artworkId: { not: null },
    },
  });

  for (const img of artworkImages) {
    await prisma.artworkImage.create({
      data: {
        imageUrl: img.imageUrl,
        alt: img.alt,
        order: img.order,
        artworkId: img.artworkId!,
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
      },
    });
  }

  // Venue Images
  const venueImages = await prisma.galleryImageUrl.findMany({
    where: {
      venueId: { not: null },
    },
  });

  for (const img of venueImages) {
    await prisma.venueImage.create({
      data: {
        imageUrl: img.imageUrl,
        alt: img.alt,
        order: img.order,
        venueId: img.venueId!,
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
      },
    });
  }
}

async function validateMigration() {
  // 각 테이블별 이미지 수 확인
  const oldProjectImages = await prisma.galleryImageUrl.count({
    where: { projectId: { not: null } },
  });
  const newProjectImages = await prisma.projectImage.count();

  const oldArtistImages = await prisma.galleryImageUrl.count({
    where: { artistId: { not: null } },
  });
  const newArtistImages = await prisma.artistImage.count();

  const oldArtworkImages = await prisma.galleryImageUrl.count({
    where: { artworkId: { not: null } }, // artworkId로 수정
  });
  const newArtworkImages = await prisma.artworkImage.count();

  const oldVenueImages = await prisma.galleryImageUrl.count({
    where: { venueId: { not: null } }, // venueId로 수정
  });
  const newVenueImages = await prisma.venueImage.count();

  console.log(
    `Project Images - Old: ${oldProjectImages}, New: ${newProjectImages}`
  );
  console.log(
    `Artist Images - Old: ${oldArtistImages}, New: ${newArtistImages}`
  );
  console.log(
    `Artwork Images - Old: ${oldArtworkImages}, New: ${newArtworkImages}`
  );
  console.log(`Venue Images - Old: ${oldVenueImages}, New: ${newVenueImages}`);
}

async function main() {
  try {
    console.log('Starting migration...');
    await migrateImages();
    console.log('Migration completed');

    console.log('Validating migration...');
    await validateMigration();
    console.log('Validation completed');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
