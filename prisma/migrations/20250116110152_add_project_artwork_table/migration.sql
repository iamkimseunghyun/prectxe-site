-- CreateTable
CREATE TABLE "ProjectArtWork" (
    "projectId" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("artworkId", "projectId"),
    CONSTRAINT "ProjectArtWork_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectArtWork_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "ArtWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
