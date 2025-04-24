import { z } from 'zod';
import { baseImageSchema, sanitizedTextTransformer } from '@/lib/schemas/base';

// 장소 스키마
export const venueSchema = z.object({
  name: z
    .string()
    .min(1, '장소 이름을 입력해주세요.')
    .max(50, '50자 이내로 입력해주세요.'),
  description: z
    .string()
    .max(1000, '설명은 1000자 이내로 입력해주세요.')
    .transform(sanitizedTextTransformer),
  address: z.string(),
  images: z.array(baseImageSchema).min(1, {
    message: '갤러리 이미지를 1개 이상 등록해주세요.',
  }),
  // projectVenue: z.array(
  //   z.object({
  //     projectId: z.string(),
  //     venueId: z.string(),
  //     Project: z.object({
  //       id: z.string(),
  //       title: z.string(),
  //       year: z.number(),
  //       mainImageUrl: z.string().nullable(),
  //     }),
  //   })
  // ),
});

// 장소 생성/수정 스키마
export const createVenueSchema = venueSchema;
export const updateVenueSchema = venueSchema.partial();

// 타입 내보내기
export type Venue = z.infer<typeof venueSchema>;
export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
