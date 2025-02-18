import { z } from 'zod';
import { baseImageSchema } from '@/lib/validations/image';
import { STRING_REGEX } from '@/lib/constants/constants';

export const venueCreateSchema = z.object({
  name: z
    .string()
    .min(1, '장소 이름을 입력해주세요.')
    .max(50, '200자 이내로 입력해주세요.'),
  description: z
    .string()
    .max(500, '설명은 500자 이내로 입력해주세요.')
    .transform((value) => value.replace(STRING_REGEX, '')),
  address: z
    .string()
    .nonempty({ message: '지도 버튼을 클릭해 주소를 입력해주세요.' }),
  images: z.array(baseImageSchema).min(1, {
    message: '갤러리 이미지를 1개 이상 등록해주세요.',
  }),
});

export type VenueFormData = z.infer<typeof venueCreateSchema>;
