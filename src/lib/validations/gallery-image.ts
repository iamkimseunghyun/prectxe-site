import { z } from 'zod';

export const galleryImageSchema = z.object({
  id: z.string().optional(),
  imageUrl: z.string(),
  alt: z.string(),
  order: z.number(),
});

export type GalleryImage = z.infer<typeof galleryImageSchema>;
export type GalleryPreview = {
  preview: string;
  file: File | null;
  uploadURL: string;
  imageUrl: string;
  alt: string;
  order: number;
};

export interface ImagePreview {
  url: string;
  type: 'cloudflare' | 'local';
}
