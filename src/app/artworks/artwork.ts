import { z } from 'zod';
import { baseImageSchema } from '@/lib/validations/image';
import { STRING_REGEX } from '@/lib/constants/constants';

// 아트웍 등록 폼 스키마 정의
export const baseArtworkFormSchema = z.object({
  title: z.string().min(2, {
    message: '이름은 2글자 이상이어야 합니다.',
  }),
  size: z
    .string()
    .min(2, {
      message: '올바른 사이즈를 입력해주세요.',
    })
    .nullable(),
  media: z
    .string({ required_error: '생년월일을 선택해주세요.' })

    .nullable(),
  year: z
    .number()
    .min(1918, '1918년 이후의 연도를 선택해주세요')
    .max(new Date().getFullYear(), '미래의 연도는 선택할 수 없습니다')
    .nullable(),
  description: z
    .string()
    .transform((value) => value.replace(STRING_REGEX, ''))
    .optional()
    .nullable(),
  style: z
    .string()
    .min(2, {
      message: '국가를 입력해주세요.',
    })
    .nullable(),
  images: z.array(baseImageSchema).optional().default([]),
  projectArtists: z
    .array(
      z.object({
        artistId: z.string(),
        artist: z.object({
          id: z.string(),
          name: z.string(),
          mainImageUrl: z.string().nullable(),
        }),
      })
    )
    .optional()
    .default([]),
  artists: z
    .array(
      z.object({
        artistId: z.string(),
        artist: z.object({
          id: z.string(),
          name: z.string(),
          mainImageUrl: z.string().nullable(),
        }),
      })
    )
    .optional()
    .default([]),
});

// 등록/수정 스키마
export const createArtworkSchema = baseArtworkFormSchema;
export const updateArtworkSchema = baseArtworkFormSchema.partial();

// 타입
export type CreateArtworkType = z.infer<typeof createArtworkSchema>;
export type UpdateArtworkType = z.infer<typeof updateArtworkSchema>;
