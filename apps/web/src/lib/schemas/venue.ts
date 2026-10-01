import { z } from 'zod';
import {
  baseImageSchema,
  sanitizedTextTransformer,
  urlSchema,
} from '@/lib/schemas/base';

// 장소 스키마
export const venueSchema = z.object({
  name: z
    .string()
    .min(1, '장소 이름을 입력해주세요.')
    .max(80, '80자 이내로 입력해주세요.'),
  tagline: z
    .string()
    .max(120, '한 줄 소개는 120자 이하로 입력하세요.')
    .optional(),
  description: z
    .string()
    .max(2000, '설명은 2000자 이내로 입력해주세요.')
    .transform(sanitizedTextTransformer)
    .optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  website: urlSchema,
  instagram: urlSchema,
  tags: z
    .array(z.string().min(1).max(30))
    .max(10, '태그는 최대 10개까지 지정할 수 있습니다.')
    .optional()
    .default([]),
  images: z.array(baseImageSchema).optional().default([]),
});

// 장소 생성/수정 스키마
export const createVenueSchema = venueSchema;
export const updateVenueSchema = venueSchema.partial();

// 타입 내보내기
export type Venue = z.infer<typeof venueSchema>;
export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
