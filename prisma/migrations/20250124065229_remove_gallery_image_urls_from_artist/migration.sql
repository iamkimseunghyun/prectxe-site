/*
  Warnings:

  - You are about to drop the column `photo` on the `Artist` table. All the data in the column will be lost.
  - Added the required column `mainImageUrl` to the `Artist` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Artist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mainImageUrl" TEXT NOT NULL,
    "birth" DATETIME NOT NULL,
    "nationality" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "homepage" TEXT NOT NULL,
    "biography" TEXT NOT NULL,
    "cv" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Artist" ("biography", "birth", "city", "country", "createdAt", "cv", "email", "homepage", "id", "name", "nationality", "updatedAt") SELECT "biography", "birth", "city", "country", "createdAt", "cv", "email", "homepage", "id", "name", "nationality", "updatedAt" FROM "Artist";
DROP TABLE "Artist";
ALTER TABLE "new_Artist" RENAME TO "Artist";
CREATE UNIQUE INDEX "Artist_email_key" ON "Artist"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
