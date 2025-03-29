import { z } from 'zod';

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

export const artworkImageSchema = imageBaseSchema.extend({
  artworkId: z.string(),
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

// Types
export type Artist = z.infer<typeof artistSchema>;
export type Artwork = z.infer<typeof artworkSchema>;
export type Venue = z.infer<typeof venueSchema>;
export type ArtworkResponse = z.infer<typeof artworkResponseSchema>;
