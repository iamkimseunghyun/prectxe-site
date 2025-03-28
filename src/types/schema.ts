// src/types/schema.ts
import {
  Artist,
  Artwork,
  ArtworkImage,
  Event,
  EventImage,
  EventOrganizer,
  EventTicket,
  Venue,
} from '@prisma/client';

// Event 관련 타입
export type EventWithRelations = Event & {
  venue: Venue | null;
  organizers: (EventOrganizer & {
    artist: Artist;
  })[];
  images: EventImage[];
  tickets: EventTicket[];
};

// Artwork 관련 타입
export type ArtworkWithRelations = Artwork & {
  images: ArtworkImage[];
  artists: {
    artist: Artist;
  }[];
};
