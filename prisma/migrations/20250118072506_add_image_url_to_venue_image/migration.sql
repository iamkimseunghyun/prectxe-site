/*
  Warnings:

  - Added the required column `imageUrl` to the `ArtWorkImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageUrl` to the `VenueImage` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ArtWorkImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ArtWorkImage_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ArtWorkImage" ("alt", "artworkId", "createdAt", "id", "updatedAt") SELECT "alt", "artworkId", "createdAt", "id", "updatedAt" FROM "ArtWorkImage";
DROP TABLE "ArtWorkImage";
ALTER TABLE "new_ArtWorkImage" RENAME TO "ArtWorkImage";
CREATE TABLE "new_VenueImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VenueImage_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VenueImage" ("alt", "createdAt", "id", "updatedAt", "venueId") SELECT "alt", "createdAt", "id", "updatedAt", "venueId" FROM "VenueImage";
DROP TABLE "VenueImage";
ALTER TABLE "new_VenueImage" RENAME TO "VenueImage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
