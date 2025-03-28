// 기본 작품 스키마
import { z } from 'zod';
import {
  baseImageSchema,
  nonEmptyStringSchema,
  sanitizedTextTransformer,
  yearSchema,
} from '@/lib/schemas/base';

export const artworkSchema = z.object({
  title: z.string().min(2, '작품 제목은 2글자 이상이어야 합니다.'),
  size: z.string().optional(),
  media: z.string().optional(),
  year: yearSchema.optional(),
  description: z.string().transform(sanitizedTextTransformer).optional(),
  style: z.string().optional(),
  images: z.array(baseImageSchema).default([]),
  artists: z
    .array(
      z.object({
        artistId: z.string(),
        artist: z.object({
          id: z.string(),
          name: z.string(),
          mainImageUrl: nonEmptyStringSchema,
        }),
      })
    )
    .default([]),
});

// 작품 생성/수정 스키마
export const createArtworkSchema = artworkSchema;
export const updateArtworkSchema = artworkSchema.partial();

// 타입 내보내기
export type Artwork = z.infer<typeof artworkSchema>;
export type CreateArtworkInput = z.infer<typeof createArtworkSchema>;
export type UpdateArtworkInput = z.infer<typeof updateArtworkSchema>;
