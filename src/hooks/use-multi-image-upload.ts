import { ChangeEvent, useState } from 'react';

import validateImageFile from '@/hooks/validate-file';
import { getCloudflareImageUrl } from '@/app/actions/upload-image';

// Base image type that represents the core image data
interface BaseImage {
  imageUrl: string;
  alt: string;
  order: number;
}

// Type for image preview with additional properties needed during upload
interface ImagePreview extends BaseImage {
  preview: string;
  file: File | null;
  uploadURL: string;
}

// Props interface for the hook
interface ImageUploadHookProps {
  initialImages?: BaseImage[];
  onGalleryChange?: (images: BaseImage[]) => void;
}

// Return type for the hook
interface ImageUploadHookReturn {
  multiImagePreview: ImagePreview[];
  error: string;
  handleMultiImageChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeMultiImage: (index: number) => void;
}

export function useMultiImageUpload({
  initialImages,
  onGalleryChange,
}: ImageUploadHookProps = {}): ImageUploadHookReturn {
  const [multiImagePreview, setMultiImagePreview] = useState<ImagePreview[]>(
    initialImages?.map((image) => ({
      ...image,
      preview: image.imageUrl,
      file: null,
      uploadURL: '',
    })) || []
  );

  const [error, setError] = useState('');

  // handleSingleFileUpload 함수 추가
  const handleSingleFileUpload = async (
    file: File,
    index: number,
    startIndex: number
  ): Promise<ImagePreview | null> => {
    const { uploadURL, imageUrl } = await getCloudflareImageUrl();

    const previewUrl = URL.createObjectURL(file);

    const preview = {
      preview: previewUrl,
      file,
      uploadURL: uploadURL,
      imageUrl: imageUrl,
      alt: file.name || 'No description',
      order: startIndex + index,
    };
    console.log('Created preview object:', preview);
    return preview;
  };

  const handleMultiImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    setError('');

    if (!files?.length) return;

    // 파일들을 실제 배열로 반환

    try {
      // 모든 파일 검증
      const newFiles = Array.from(files);
      newFiles.forEach(validateImageFile);

      const startIndex = multiImagePreview.length;

      // 단일 파일 업로드 함수 사용
      const newPreviews = await Promise.all(
        newFiles.map((file, index) =>
          handleSingleFileUpload(file, index, startIndex)
        )
      );
      const filteredPreviews = newPreviews.filter(
        (preview): preview is ImagePreview => preview !== null
      );

      setMultiImagePreview((prev) => {
        const updatedPreviews = [...prev, ...filteredPreviews];

        const baseImages: BaseImage[] = updatedPreviews.map(
          ({ imageUrl, alt, order }) => ({
            imageUrl,
            alt,
            order,
          })
        );

        onGalleryChange?.(baseImages);
        return updatedPreviews;
      });
    } catch (error) {
      console.error('Error handling gallery images:', error);
      setError(
        error instanceof Error
          ? error.message
          : '이미지 처리 중 오류가 발생했습니다.'
      );
    }
  };

  const removeMultiImage = (index: number) => {
    setMultiImagePreview((prev) => {
      const newPreviews = prev
        .filter((_, i) => i !== index)
        .map((preview, i) => ({
          ...preview,
          order: i,
        }));

      const baseImages: BaseImage[] = newPreviews.map(
        ({ imageUrl, alt, order }) => ({
          imageUrl,
          alt,
          order,
        })
      );

      // 이미지 제거 시에도 콜백 호출
      onGalleryChange?.(baseImages);
      return newPreviews;
    });
  };
  return {
    multiImagePreview,
    error,
    handleMultiImageChange,
    removeMultiImage,
  };
}
