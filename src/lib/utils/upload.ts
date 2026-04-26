import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants/constants';
import type { ImagePreview } from '@/lib/schemas';

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

export const uploadGalleryImages = async (previews: ImagePreview[]) => {
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

export function validateImageFile(file: File) {
  try {
    file.slice(0, 1).arrayBuffer();
  } catch (e) {
    console.error(e);
    throw new Error(
      '파일에 접근할 수 없습니다. 파일이 사용 가능한 상태인지 확인해주세요.'
    );
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(
      '지원되지 않는 이미지 형식입니다. JPG, PNG, GIF, WEBP, HEIC만 가능합니다.'
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기는 5MB를 초과할 수 없습니다.');
  }
  return null;
}
