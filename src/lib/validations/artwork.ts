import { z } from 'zod';
import { galleryImageSchema } from '@/lib/validations/gallery-image';

// 아트웍 등록 폼 스키마 정의
export const artworkCreateSchema = z.object({
  title: z.string().min(2, {
    message: '이름은 2글자 이상이어야 합니다.',
  }),
  size: z.string().min(2, {
    message: '올바른 사이즈를 입력해주세요.',
  }),
  media: z.string({ required_error: '생년월일을 선택해주세요.' }),
  year: z
    .number()
    .min(1918, '1918년 이후의 연도를 선택해주세요')
    .max(new Date().getFullYear(), '미래의 연도는 선택할 수 없습니다'),
  description: z.string().min(2, {
    message: '도시를 입력해주세요.',
  }),
  style: z.string().min(2, {
    message: '국가를 입력해주세요.',
  }),
  images: z.array(galleryImageSchema).min(1, {
    message: '갤러리 이미지를 1개 이상 등록해주세요.',
  }),
});

export type ArtworkFormData = z.infer<typeof artworkCreateSchema>;
