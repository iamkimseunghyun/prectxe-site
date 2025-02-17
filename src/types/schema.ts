// src/types/schema.ts
import {
  Event,
  Artist,
  Artwork,
  Project,
  Venue,
  EventImage,
  EventOrganizer,
  EventTicket,
  ProjectImage,
  ProjectArtist,
  ProjectVenue,
  ArtistImage,
  ArtworkImage,
  VenueImage,
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

// Artist 관련 타입
export type ArtistWithRelations = Artist & {
  images: ArtistImage[];
  eventOrganizers: (EventOrganizer & {
    event: Event;
  })[];
};

// Artwork 관련 타입
export type ArtworkWithRelations = Artwork & {
  images: ArtworkImage[];
  artists: {
    artist: Artist;
  }[];
};

// Project 관련 타입
export type ProjectWithRelations = Project & {
  images: ProjectImage[];
  projectArtists: (ProjectArtist & {
    artist: Artist;
  })[];
  venues: (ProjectVenue & {
    venue: Venue;
  })[];
};

// Venue 관련 타입
export type VenueWithRelations = Venue & {
  images: VenueImage[];
  Event: Event[];
};

// Schema.org 컴포넌트 Props 타입
export interface SchemaProps {
  event: EventWithRelations;
  artwork: ArtworkWithRelations;
  project: ProjectWithRelations;
  venue: VenueWithRelations;
}
