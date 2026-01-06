import { z } from 'zod';

export const ProgramTypeEnum = z.enum([
  'exhibition',
  'live',
  'party',
  'workshop',
  'talk',
]);

export const ProgramStatusEnum = z.enum(['draft', 'upcoming', 'completed']);

export const programBaseSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요'),
  slug: z.string().min(1, '고유 슬러그를 입력하세요'),
  summary: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  type: ProgramTypeEnum,
  status: ProgramStatusEnum.default('upcoming'),
  startAt: z.string().min(1, '시작일을 입력하세요'), // YYYY-MM-DD
  endAt: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  heroUrl: z
    .string()
    .url('유효한 이미지 URL이어야 합니다.')
    .optional()
    .nullable(),
  venue: z.string().optional().nullable(),
  organizer: z.string().optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
});

export const programCreateSchema = programBaseSchema.extend({
  credits: z
    .array(
      z.object({
        artistId: z.string(),
        role: z.string().min(1, '역할을 입력하세요'),
      })
    )
    .optional(),
  images: z
    .array(
      z.object({
        imageUrl: z.string().url(),
        alt: z.string().default(''),
        order: z.number().default(0),
      })
    )
    .optional(),
});

export const programUpdateSchema = programCreateSchema.partial({ slug: true });

export type ProgramCreateInput = z.infer<typeof programCreateSchema>;
export type ProgramUpdateInput = z.infer<typeof programUpdateSchema>;
