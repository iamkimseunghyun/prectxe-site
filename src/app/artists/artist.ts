import { z } from 'zod';
import { baseImageSchema } from '@/lib/validations/image';
import { STRING_REGEX } from '@/lib/constants/constants';

export const simpleArtistCreateSchema = z.object({
  name: z.string().min(1, '이름을 영어로 입력해주세요'),
  nameKr: z.string().min(1, '이름을 한글로 입력해주세요'),
  email: z.string().email().optional().or(z.literal('')),
  mainImageUrl: z
    .string()
    .url('유효한 URL을 입력해주세요')
    .optional()
    .or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
});

// 아티스트 등록 폼 스키마 정의
export const baseArtistCreateSchema = z.object({
  name: z.string().min(2, {
    message: '이름은 2글자 이상이어야 합니다.',
  }),
  nameKr: z.string().min(2, {
    message: '이름은 2글자 이상이어야 합니다.',
  }),
  mainImageUrl: z.string({
    required_error: ' 사진 첨부는 필수입니다. 🥺',
  }),
  city: z
    .string()
    .min(2, {
      message: '도시를 입력해주세요.',
    })
    .optional()
    .nullable(),
  country: z
    .string()
    .min(2, {
      message: '국가를 입력해주세요.',
    })
    .optional()
    .nullable(),
  email: z
    .string()
    .email({
      message: '올바른 이메일 주소를 입력해주세요.',
    })
    .optional()
    .nullable(),
  homepage: z.string().optional().nullable(),
  biography: z
    .string()
    .transform((value) => value.replace(STRING_REGEX, ''))
    .optional()
    .nullable(),
  cv: z
    .string()
    .transform((value) => value.replace(STRING_REGEX, ''))
    .optional()
    .nullable(),
  images: z.array(baseImageSchema).optional().default([]),
});

// 등록/수정 스키마
export const createSimpleArtistSchema = simpleArtistCreateSchema;
export const createArtistSchema = baseArtistCreateSchema;
export const updateArtistSchema = baseArtistCreateSchema.partial();

// 타입
export type SimpleArtistType = z.infer<typeof createSimpleArtistSchema>;
export type CreateArtistType = z.infer<typeof createArtistSchema>;
export type UpdateArtistType = z.infer<typeof updateArtistSchema>;
