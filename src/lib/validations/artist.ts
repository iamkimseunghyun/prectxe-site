import { z } from 'zod';
import { baseImageSchema } from '@/lib/validations/image';

export const artistSimpleCreateSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('유효한 이메일을 입력해주세요').optional(),
  mainImageUrl: z.string().optional(),
  nationality: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

// 아티스트 등록 폼 스키마 정의
export const artistCreateSchema = z.object({
  name: z.string().min(2, {
    message: '이름은 2글자 이상이어야 합니다.',
  }),
  mainImageUrl: z
    .string({
      required_error: ' 사진 첨부는 필수입니다. 🥺',
    })
    .optional()
    .nullable(),
  birth: z
    .string({ required_error: '생년월일을 선택해주세요.' })
    .optional()
    .nullable(),
  nationality: z
    .string()
    .min(2, {
      message: '국적을 입력해주세요.',
    })
    .optional()
    .nullable(),
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
  homepage: z
    .string()
    .url({
      message: '올바른 URL을 입력해주세요.',
    })
    .optional()
    .nullable(),
  biography: z
    .string()
    .min(10, {
      message: '약력은 10자 이상 입력해주세요.',
    })
    .optional()
    .nullable(),
  cv: z
    .string()
    .min(10, {
      message: '이력서는 10자 이상 입력해주세요.',
    })
    .optional()
    .nullable(),
  images: z.array(baseImageSchema).min(1, {
    message: '갤러리 이미지를 1개 이상 등록해주세요.',
  }),
});

export type ArtistFormData = z.infer<typeof artistCreateSchema>;
