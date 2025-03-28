import { z } from 'zod';

import { STRING_REGEX } from '@/lib/constants/constants';
import { baseImageSchema } from '@/lib/schemas';

export const venueCreateSchema = z.object({
  name: z
    .string()
    .min(1, '장소 이름을 입력해주세요.')
    .max(50, '200자 이내로 입력해주세요.'),
  description: z
    .string()
    .max(1000, '설명은 1000자 이내로 입력해주세요.')
    .transform((value) => value.replace(STRING_REGEX, '')),
  address: z.string(),
  images: z.array(baseImageSchema).min(1, {
    message: '갤러리 이미지를 1개 이상 등록해주세요.',
  }),
});

export type VenueFormData = z.infer<typeof venueCreateSchema>;
