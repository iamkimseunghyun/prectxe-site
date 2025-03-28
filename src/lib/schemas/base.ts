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
  .refine((value) => !isNaN(Date.parse(value)), {
    message: '유효한 날짜 형식이어야 합니다',
  });

// 이메일 스키마
export const emailSchema = z.string().email('유효한 이메일 주소를 입력하세요');

// URL 스키마
export const urlSchema = z
  .string()
  .url('유효한 URL을 입력하세요')
  .optional()
  .nullable();

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
export const sanitizedTextTransformer = (value: string) =>
  value.replace(/[^\x20-\x7E\t\n\r]/g, ''); // 출력 가능한 ASCII와 일부 공백 문자만 유지
