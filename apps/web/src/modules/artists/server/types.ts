export type ArtistImage = {
  id: string;
  imageUrl: string;
  alt: string;
  order: number;
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

export type ArtistDropCredit = {
  role: string;
  drop: {
    id: string;
    slug: string;
    title: string;
    type: string;
    eventDate: Date | null;
    eventEndDate: Date | null;
    venue: string | null;
    media: { url: string; alt: string }[];
  };
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
};
