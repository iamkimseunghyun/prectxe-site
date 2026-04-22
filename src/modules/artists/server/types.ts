export type ArtistImage = {
  id: string;
  imageUrl: string;
  alt: string;
  order: number;
};

export type ArtistArtwork = {
  artwork: {
    id: string;
    title: string;
    year: string | null;
    images: { id: string; imageUrl: string; alt: string }[];
  };
};

export type ArtistProgramCredit = {
  role: string;
  program: {
    id: string;
    title: string;
    slug: string;
    status: string;
    type: string | null;
    startAt: Date | null;
    endAt: Date | null;
    heroUrl: string | null;
    venue: string | null;
    city: string | null;
  };
};

export type ArtistDetail = {
  id: string;
  name: string;
  nameKr: string;
  mainImageUrl?: string;
  email?: string;
  city?: string;
  country?: string;
  homepage?: string;
  instagram?: string;
  soundcloud?: string;
  bandcamp?: string;
  youtube?: string;
  spotify?: string;
  tagline?: string;
  tags: string[];
  biography?: string;
  cv?: string;
  userId: string;
  createdAt: Date;
  images: ArtistImage[];
  artistArtworks: ArtistArtwork[];
  programCredits: ArtistProgramCredit[];
};

export type ArtistCardData = {
  id: string;
  name: string;
  nameKr: string;
  mainImageUrl?: string | null;
  city?: string | null;
  country?: string | null;
  tagline?: string | null;
  tags: string[];
  artistArtworks: { artwork: { id: string } }[];
};
