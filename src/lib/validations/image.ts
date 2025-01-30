import { z } from 'zod';

export const baseImageSchema = z.object({
  id: z.string().optional(),
  imageUrl: z.string(),
  alt: z.string(),
  order: z.number(),
});
