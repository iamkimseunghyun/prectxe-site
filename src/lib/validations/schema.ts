import { z } from 'zod';
import { EventWithRelations } from '@/types/schema';

// Helper function to transform strings to dates
// const dateTransformer = z
//   .string()
//   .or(z.date())
//   .transform((val) => {
//     if (typeof val === 'string') {
//       return new Date(val);
//     }
//     return val;
//   });

// Enums
export const RoleEnum = z.enum(['ADMIN', 'USER']);
export const EventStatusEnum = z.enum([
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
]);
export const EventTypeEnum = z.enum([
  'exhibition',
  'performance',
  'festival',
  'workshop',
  'talk',
  'screening',
  'other',
]);
export const ProjectCategoryEnum = z.enum([
  'exhibition',
  'performance',
  'festival',
  'workshop',
]);

// Base Schemas
export const artistSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameKr: z.string(),
  mainImageUrl: z.string().nullable(),
  email: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  homepage: z.string().nullable(),
  biography: z.string().nullable(),
  cv: z.string().nullable(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const artworkSchema = z.object({
  id: z.string(),
  title: z.string(),
  size: z.string().nullable(),
  media: z.string().nullable(),
  year: z.number().nullable(),
  description: z.string().nullable(),
  style: z.string().nullable(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const venueSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  address: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Image Schemas
export const imageBaseSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  alt: z.string(),
  order: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const artistImageSchema = imageBaseSchema.extend({
  artistId: z.string(),
});

export const artworkImageSchema = imageBaseSchema.extend({
  artworkId: z.string(),
});

export const eventImageSchema = imageBaseSchema.extend({
  eventId: z.string(),
});

export const venueImageSchema = imageBaseSchema.extend({
  venueId: z.string(),
});

// Relation Schemas
export const artistArtworkSchema = z.object({
  artistId: z.string(),
  artworkId: z.string(),
  artist: artistSchema,
  artwork: artworkSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const eventOrganizerSchema = z.object({
  eventId: z.string(),
  artistId: z.string(),
  role: z.string(),
  artist: artistSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const eventTicketSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Full Relation Schemas (prisma 스키마와 1:1 매칭)
export const artworkWithRelationsSchema = artworkSchema.extend({
  images: z.array(artworkImageSchema),
  artists: z.array(artistArtworkSchema),
});

export const eventWithRelationsSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  description: z.string(),
  status: EventStatusEnum,
  type: EventTypeEnum,
  startDate: z.date(),
  endDate: z.date(),
  mainImageUrl: z.string(),
  userId: z.string(),
  venueId: z.string().nullable(),
  venue: venueSchema.nullable(),
  organizers: z.array(eventOrganizerSchema),
  tickets: z.array(eventTicketSchema),
  images: z.array(eventImageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Response DTOs (API 응답용 부분 스키마)
export const artistReducedSchema = artistSchema.pick({
  id: true,
  name: true,
  nameKr: true,
  mainImageUrl: true,
});

export const artworkResponseSchema = artworkSchema.extend({
  images: z.array(artworkImageSchema),
  artists: z.array(
    z.object({
      artistId: z.string(),
      artworkId: z.string(),
      artist: artistReducedSchema,
      createdAt: z.date().optional(),
      updatedAt: z.date().optional(),
    })
  ),
});

// Project 관련 스키마
export const projectSchema = z.object({
  id: z.string(),
  title: z.string(),
  about: z.string(),
  description: z.string(),
  year: z.number(),
  startDate: z.date(),
  endDate: z.date(),
  category: ProjectCategoryEnum,
  mainImageUrl: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const projectImageSchema = imageBaseSchema.extend({
  projectId: z.string(),
});

export const projectArtistSchema = z.object({
  projectId: z.string(),
  artistId: z.string(),
  artist: artistReducedSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const projectVenueSchema = z.object({
  projectId: z.string(),
  venueId: z.string(),
  venue: venueSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const projectWithRelationsSchema = projectSchema.extend({
  images: z.array(projectImageSchema),
  projectArtists: z.array(projectArtistSchema),
  venues: z.array(projectVenueSchema),
});

// Types
export type Artist = z.infer<typeof artistSchema>;
export type Artwork = z.infer<typeof artworkSchema>;
export type Venue = z.infer<typeof venueSchema>;
export type ArtistImage = z.infer<typeof artistImageSchema>;
export type ArtworkImage = z.infer<typeof artworkImageSchema>;
export type EventImage = z.infer<typeof eventImageSchema>;
export type VenueImage = z.infer<typeof venueImageSchema>;
export type ArtistArtwork = z.infer<typeof artistArtworkSchema>;
export type EventTicket = z.infer<typeof eventTicketSchema>;
export type EventOrganizer = z.infer<typeof eventOrganizerSchema>;
export type ProjectCategory = z.infer<typeof ProjectCategoryEnum>;

// Full Relation Types

export type ArtworkWithRelations = z.infer<typeof artworkWithRelationsSchema>;

export type ProjectWithRelations = z.infer<typeof projectWithRelationsSchema>;
export type VenueWithRelations = z.infer<typeof venueSchema>;

// Response DTO Types
export type ArtistReduced = z.infer<typeof artistReducedSchema>;
export type ArtworkResponse = z.infer<typeof artworkResponseSchema>;

// Validation Functions
export function validateEventData(data: unknown): EventWithRelations {
  return eventWithRelationsSchema.parse(data);
}

export function validateArtworkData(data: unknown): ArtworkResponse {
  return artworkResponseSchema.parse(data);
}

// Partial Schemas
export const partialEventSchema = eventWithRelationsSchema.partial();
export const partialArtworkSchema = artworkWithRelationsSchema.partial();

export type PartialEvent = z.infer<typeof partialEventSchema>;
export type PartialArtwork = z.infer<typeof partialArtworkSchema>;
