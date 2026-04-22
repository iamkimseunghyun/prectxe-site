// 기본 아티스트 스키마
import { z } from 'zod';
import {
  baseImageSchema,
  emailSchema,
  nonEmptyStringSchema,
  sanitizedTextTransformer,
  urlSchema,
} from '@/lib/schemas/base';

export const artistSchema = z.object({
  name: nonEmptyStringSchema.min(2, '이름은 2글자 이상이어야 합니다.'),
  nameKr: nonEmptyStringSchema.min(2, '이름은 2글자 이상이어야 합니다.'),
  mainImageUrl: nonEmptyStringSchema,
  email: emailSchema.optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  homepage: urlSchema,
  instagram: urlSchema,
  soundcloud: urlSchema,
  bandcamp: urlSchema,
  youtube: urlSchema,
  spotify: urlSchema,
  tagline: z
    .string()
    .max(120, '한 줄 소개는 120자 이하로 입력하세요.')
    .optional(),
  tags: z
    .array(z.string().min(1).max(30))
    .max(10, '태그는 최대 10개까지 지정할 수 있습니다.')
    .optional()
    .default([]),
  biography: z.string().transform(sanitizedTextTransformer).optional(),
  cv: z.string().transform(sanitizedTextTransformer).optional(),
  images: z.array(baseImageSchema).optional().default([]),
});

// 간단한 아티스트 생성 스키마 (빠른 등록용)
export const simpleArtistSchema = z.object({
  name: nonEmptyStringSchema.min(2, '이름은 2글자 이상이어야 합니다.'),
  nameKr: nonEmptyStringSchema.min(2, '이름은 2글자 이상이어야 합니다.'),
  mainImageUrl: nonEmptyStringSchema,
  email: emailSchema.optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

// 아티스트 생성/수정 스키마
export const createArtistSchema = artistSchema;
export const updateArtistSchema = artistSchema.partial();

// 타입 내보내기
export type Artist = z.infer<typeof artistSchema>;
export type SimpleArtist = z.infer<typeof simpleArtistSchema>;
export type CreateArtistInput = z.infer<typeof createArtistSchema>;
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>;
