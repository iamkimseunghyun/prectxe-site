import { z } from 'zod';

export const articleBaseSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요'),
  slug: z.string().min(1, '슬러그를 입력하세요'),
  excerpt: z.string().optional().nullable(),
  body: z.string().min(1, '본문을 입력하세요'),
  cover: z
    .string()
    .url('유효한 이미지 URL이어야 합니다.')
    .optional()
    .nullable(),
  tags: z.array(z.string()).optional().default([]),
  publishedAt: z.string().optional().nullable(), // YYYY-MM-DD
  isFeatured: z.boolean().optional().default(false),
});

export const articleCreateSchema = articleBaseSchema;
export const articleUpdateSchema = articleBaseSchema.partial({ slug: true });

export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;
