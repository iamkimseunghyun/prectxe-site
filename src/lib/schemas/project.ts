import { z } from 'zod';
import {
  baseImageSchema,
  isoDateStringSchema,
  sanitizedTextTransformer,
  yearSchema,
} from '@/lib/schemas/base';
import { ProjectCategory } from '@/lib/schemas/types';

// 프로젝트 스키마
export const projectSchema = z.object({
  title: z.string().max(100, '제목은 100자 이내로 입력해주세요'),
  about: z
    .string()
    .max(1000, '간단 소개는 1000자 이하로 입력해주세요.')
    .transform(sanitizedTextTransformer),
  description: z
    .string()
    .max(10000, '설명은 10,000자 이내로 입력해주세요')
    .transform(sanitizedTextTransformer),
  year: yearSchema,
  category: z.nativeEnum(ProjectCategory, {
    required_error: '카테고리를 선택해주세요',
    invalid_type_error: '유효한 카테고리를 선택해주세요',
  }),
  startDate: isoDateStringSchema,
  endDate: isoDateStringSchema,
  mainImageUrl: z.string().nullable(),
  images: z
    .array(baseImageSchema)
    .min(1, {
      message: '갤러리 이미지를 1개 이상 등록해주세요.',
    })
    .default([]),
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
    .default([]),
});

// 생성 스키마 (refine 추가)
export const createProjectSchema = projectSchema.refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: '종료일은 시작일 이전 일 수 없습니다.',
    path: ['endDate'],
  }
);

// 업데이트 스키마 (refine 추가, 하지만 partial 적용)
export const updateProjectSchema = projectSchema.partial().refine(
  (data) => {
    // startDate와 endDate가 모두 있을 때만 검증
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: '종료일은 시작일 이전일 수 없습니다.',
    path: ['endDate'],
  }
);

// 타입 내보내기
export type Project = z.infer<typeof projectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
