import { z } from 'zod';
import { baseImageSchema } from '@/lib/validations/image';
import { STRING_REGEX } from '@/lib/constants/constants';

export const baseProjectSchema = z.object({
  mainImageUrl: z.string(),

  title: z.string().max(100, '제목은 100자 이내로 입력해주세요'),

  about: z
    .string()
    .max(1000, '간단 소개는 1000자 이하로 입력해주세요.')
    .transform((value) => value.replace(STRING_REGEX, '')),

  description: z
    .string()
    .max(10000, '설명은 10,000자 이내로 입력해주세요')
    .transform((value) => value.replace(STRING_REGEX, '')),

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

export const createProjectSchema = baseProjectSchema
  .required({
    about: true,
    category: true,
    description: true,
    endDate: true,
    mainImageUrl: true,
    startDate: true,
    title: true,
    year: true,
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: '종료일은 시작일 이전 일 수 없습니다.',
    path: ['endDate'],
  });

export const updateProjectSchema = baseProjectSchema.partial().refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: '종료일은 시작일 이전 일 수 없습니다.',
    path: ['endDate'],
  }
);

export type CreateProjectType = z.infer<typeof createProjectSchema>;
export type UpdateProjectType = z.infer<typeof updateProjectSchema>;
