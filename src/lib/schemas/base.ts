import { z } from 'zod';

export const baseImageSchema = z.object({
  id: z.string().optional(),
  imageUrl: z.string(),
  alt: z.string(),
  order: z.number(),
});

export type ImageData = z.infer<typeof baseImageSchema>;

// 날짜 변환 헬퍼
export const dateSchema = z.preprocess((arg) => {
  if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
  return arg;
}, z.date());

// ISO 날짜 문자열 스키마
export const isoDateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: '유효한 날짜 형식이어야 합니다',
  });

// 이메일 스키마
export const emailSchema = z.string().email('유효한 이메일 주소를 입력하세요');

// URL 스키마
export const urlSchema = z.string().url('유효한 URL을 입력하세요').optional();

// 비어있지 않은 텍스트 스키마
export const nonEmptyStringSchema = z.string().min(1, '이 필드는 필수입니다');

// 연도 스키마
export const yearSchema = z
  .number()
  .int('연도는 정수여야 합니다')
  .min(1900, '1900년 이후의 연도를 입력하세요')
  .max(new Date().getFullYear() + 5, '유효한 연도를 입력하세요');

// 페이지네이션 스키마
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// ID 스키마
export const idSchema = z.string().uuid('유효한 ID 형식이 아닙니다');

// Description 텍스트 정제 변환기
// Improved implementation - preserves Unicode characters
export const sanitizedTextTransformer = (value: string) => {
  // Option 1: Remove only truly dangerous control characters but keep Unicode
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Option 2: Or if you need to remove specific characters but keep Korean, emojis, etc.
  // return value.replace(/[<specific characters to remove>]/g, '');

  // Option 3: If you want to sanitize HTML/script tags but keep Unicode
  // return value
  //   .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  //   .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  //   .replace(/<[^>]*>/g, ''); // Remove HTML tags
};
