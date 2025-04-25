import { ChangeEvent, useEffect, useState } from 'react';

import { getCloudflareImageUrl } from '@/lib/cdn/cloudflare';
import validateImageFile from '@/lib/utils';

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

  // 이미지 변경 시 onGalleryChange 호출하는 useEffect 추가
  useEffect(() => {
    if (onGalleryChange && multiImagePreview.length >= 0) {
      const baseImages: BaseImage[] = multiImagePreview.map(
        ({ imageUrl, alt, order }) => ({
          imageUrl,
          alt,
          order,
        })
      );
      onGalleryChange(baseImages);
    }
  }, [multiImagePreview, onGalleryChange]);

  // handleSingleFileUpload 함수 추가
  const handleSingleFileUpload = async (
    file: File,
    index: number,
    startIndex: number
  ): Promise<ImagePreview | null> => {
    const { uploadURL, imageUrl } = await getCloudflareImageUrl();

    const previewUrl = URL.createObjectURL(file);

    return {
      preview: previewUrl,
      file,
      uploadURL: uploadURL,
      imageUrl: imageUrl,
      alt: file.name || 'No description',
      order: startIndex + index,
    };
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
        return [...prev, ...filteredPreviews];
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
      return prev
        .filter((_, i) => i !== index)
        .map((preview, i) => ({
          ...preview,
          order: i,
        }));
    });
  };
  return {
    multiImagePreview,
    error,
    handleMultiImageChange,
    removeMultiImage,
  };
}
