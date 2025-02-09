import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GalleryPreview } from '@/lib/validations/gallery-image';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateForInput = (
  isoString: string | null | undefined
): string => {
  if (!isoString) return formatDate(new Date());
  return isoString.split('T')[0]; // "2024-02-01T00:00:00.000Z" -> "2024-02-01"
};

export const getImageUrl = (
  url: string | null | undefined,
  variant: 'thumbnail' | 'public' | 'smaller'
) => {
  if (!url) return '';
  return `${url}/${variant}`;
};

export const uploadSingleImage = async (imageFile: File, uploadURL: string) => {
  if (imageFile) {
    const cloudFlareForm = new FormData();
    cloudFlareForm.append('file', imageFile);
    const response = await fetch(uploadURL, {
      method: 'POST',
      body: cloudFlareForm,
    });
    if (response.status !== 200) {
      throw new Error('Failed to upload main image');
    }
  }
};

// 이미지 업로드 함수 (클라이언트)
export const uploadImage = async (
  file: File,
  uploadURL: string
): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(uploadURL, {
      method: 'POST',
      body: formData,
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to upload image:', error);
    return false;
  }
};

export const uploadGalleryImages = async (previews: GalleryPreview[]) => {
  return Promise.all(
    previews.map(async (preview) => {
      const formData = new FormData();
      formData.append('file', preview.file!);
      const response = await fetch(preview.uploadURL, {
        method: 'POST',
        body: formData,
      });
      if (response.status !== 200) {
        throw new Error(`Failed to upload: ${preview.alt}`);
      }
    })
  );
};
