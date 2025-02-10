// lib/validations/project.ts
import { z } from 'zod';
import { baseImageSchema } from '@/lib/validations/image';

export const projectCreateSchema = z
  .object({
    mainImageUrl: z.string({
      required_error: ' 사진 첨부는 필수입니다. 🥺',
    }),

    title: z
      .string()
      .min(1, '제목을 입력해주세요')
      .max(100, '제목은 100자 이내로 입력해주세요'),

    about: z
      .string()
      .min(10, '간단 소개는 최소 10자 이상 입력해주세요')
      .max(200, '간단 소개는 500자 이하로 입력해주세요.'),

    description: z
      .string()
      .min(10, '상세 내용은 최소 200자 이상 입력해주세요')
      .max(2000, '설명은 5000자 이내로 입력해주세요'),

    year: z
      .number()
      .min(2018, '2018년 이후의 연도를 선택해주세요')
      .max(new Date().getFullYear(), '미래의 연도는 선택할 수 없습니다'),

    category: z.enum(['exhibition', 'performance', 'festival', 'workshop'], {
      required_error: '카테고리를 선택해주세요',
      invalid_type_error: '유효한 카테고리를 선택해주세요',
    }),

    startDate: z.string({
      required_error: '시작일을 선택해주세요.',
    }),
    endDate: z.string({
      required_error: '종료일을 선택해주세요.',
    }),

    images: z.array(baseImageSchema).min(1, {
      message: '갤러리 이미지를 1개 이상 등록해주세요.',
    }),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: '종료일은 시작일 이전 일 수 없습니다.',
    path: ['endDate'],
  });

export type ProjectFormData = z.infer<typeof projectCreateSchema>;
