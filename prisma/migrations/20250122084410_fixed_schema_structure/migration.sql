/*
  Warnings:

  - You are about to drop the `ArtWorkImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VenueImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ArtWorkImage";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "VenueImage";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GalleryImageUrl" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT,
    "artistId" TEXT,
    "artworkId" TEXT,
    "venueId" TEXT,
    CONSTRAINT "GalleryImageUrl_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GalleryImageUrl_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GalleryImageUrl_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GalleryImageUrl_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GalleryImageUrl" ("alt", "createdAt", "id", "imageUrl", "order", "projectId", "updatedAt") SELECT "alt", "createdAt", "id", "imageUrl", "order", "projectId", "updatedAt" FROM "GalleryImageUrl";
DROP TABLE "GalleryImageUrl";
ALTER TABLE "new_GalleryImageUrl" RENAME TO "GalleryImageUrl";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
