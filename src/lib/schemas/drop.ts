import { z } from 'zod';

// Drop create/update 서버 액션 입력 검증. 다른 모듈과 동일하게
// parseInput(schema, data) 게이트로 사용한다.

export const dropStatusSchema = z.enum([
  'draft',
  'upcoming',
  'on_sale',
  'sold_out',
  'closed',
]);

export const dropMediaSchema = z.object({
  type: z.enum(['image', 'video']),
  url: z.string().min(1, '미디어 URL이 비어 있습니다.'),
  alt: z.string(),
  order: z.coerce.number().int(),
});

export const dropCreditSchema = z.object({
  artistId: z.string().min(1, '아티스트를 선택해주세요.'),
  role: z.string(),
});

export const dropCreateSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  slug: z.string().min(1, 'slug를 입력해주세요.'),
  type: z.enum(['ticket', 'goods']),
  summary: z.string().optional(),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  eventEndDate: z.string().optional(),
  venue: z.string().optional(),
  venueAddress: z.string().optional(),
  venueId: z.string().optional(),
  notice: z.string().optional(),
  status: dropStatusSchema.optional(),
  media: z.array(dropMediaSchema).optional(),
  credits: z.array(dropCreditSchema).optional(),
});

export type DropCreateInput = z.infer<typeof dropCreateSchema>;

export const dropUpdateSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.').optional(),
  slug: z.string().min(1, 'slug를 입력해주세요.').optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  eventEndDate: z.string().optional(),
  venue: z.string().optional(),
  venueAddress: z.string().optional(),
  venueId: z.string().nullable().optional(),
  notice: z.string().optional(),
  status: dropStatusSchema.optional(),
  publishedAt: z.string().nullable().optional(),
  media: z.array(dropMediaSchema).optional(),
  credits: z.array(dropCreditSchema).optional(),
});

export type DropUpdateInput = z.infer<typeof dropUpdateSchema>;
