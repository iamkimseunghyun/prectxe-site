import { z } from 'zod';
import { galleryImageSchema } from '@/lib/validations/gallery-image';

export const venueCreateSchema = z.object({
  name: z
    .string()
    .min(1, '장소 이름을 입력해주세요.')
    .max(50, '200자 이내로 입력해주세요.'),
  description: z
    .string()
    .min(10, '설명은 10자 이상 입력해주세요.')
    .max(500, '설명은 500자 이내로 입력해주세요.'),
  address: z
    .string()
    .nonempty({ message: '지도 버튼을 클릭해 주소를 입력해주세요.' }),
  galleryImageUrls: z.array(galleryImageSchema).min(1, {
    message: '갤러리 이미지를 1개 이상 등록해주세요.',
  }),
});

export type VenueFormData = z.infer<typeof venueCreateSchema>;
