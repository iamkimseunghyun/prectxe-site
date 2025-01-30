import { ChangeEvent, useState } from 'react';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants/constants';
import { getUploadedProductImageURL } from '@/hooks/get-cloudflare-image-upload-url';
import { GalleryImage, GalleryPreview } from '@/lib/validations/gallery-image';

interface UseGalleryImagesProps {
  initialImages?: {
    imageUrl: string;
    alt: string;
    order: number;
  }[];
  onGalleryChange?: (galleryData: Array<GalleryImage>) => void;
}

interface UseGalleryImagesReturn {
  galleryPreviews: GalleryPreview[];
  fileError: string;
  handleGalleryImageChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeGalleryImage: (index: number) => void;
}

export function useGalleryImages({
  initialImages,
  onGalleryChange,
}: UseGalleryImagesProps = {}): UseGalleryImagesReturn {
  const [galleryPreviews, setGalleryPreviews] = useState<GalleryPreview[]>(
    initialImages?.map((image, index) => ({
      preview: image.imageUrl,
      file: null,
      uploadURL: '',
      imageUrl: image.imageUrl,
      alt: image.alt,
      order: index,
    })) || []
  );

  const [fileError, setFileError] = useState('');

  const validateFile = (file: File) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(
        '지원되지 않는 이미지 형식입니다. JPG, PNG, GIF, WEBP만 가능합니다.'
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('파일 크기는 5MB를 초과할 수 없습니다.');
    }
  };

  // handleSingleFileUpload 함수 추가
  const handleSingleFileUpload = async (
    file: File,
    index: number,
    startIndex: number
  ): Promise<GalleryPreview | null> => {
    const { success, result } = await getUploadedProductImageURL();
    if (!success) return null;

    const previewUrl = URL.createObjectURL(file);
    console.log('Created preview URL:', previewUrl);

    const preview = {
      preview: previewUrl,
      file,
      uploadURL: result.uploadURL,
      imageUrl: `https://imagedelivery.net/UYdYeWsHCBBURfLH8Q-Ggw/${result.id}`,
      alt: file.name || 'No description',
      order: startIndex + index,
    };
    console.log('Created preview object:', preview);
    return preview;
  };

  const handleGalleryImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    setFileError('');

    if (!files || files.length === 0) return;

    // 파일들을 실제 배열로 반환
    const newFiles = Array.from(files);

    try {
      // 모든 파일 검증
      newFiles.forEach(validateFile);

      const startIndex = galleryPreviews.length;

      // 단일 파일 업로드 함수 사용
      const newPreviews = await Promise.all(
        newFiles.map((file, index) =>
          handleSingleFileUpload(file, index, startIndex)
        )
      );
      const filteredPreviews = newPreviews.filter(
        (preview): preview is NonNullable<typeof preview> => preview !== null
      );

      setGalleryPreviews((prev) => {
        const updatedPreviews = [...prev, ...filteredPreviews];
        onGalleryChange?.(
          updatedPreviews.map((preview) => ({
            imageUrl: preview.imageUrl,
            alt: preview.alt,
            order: preview.order,
          }))
        );
        return updatedPreviews;
      });
    } catch (error) {
      console.error('Error handling gallery images:', error);
      setFileError(
        error instanceof Error
          ? error.message
          : '이미지 처리 중 오류가 발생했습니다.'
      );
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryPreviews((prev) => {
      const newPreviews = prev
        .filter((_, i) => i !== index)
        .map((preview, i) => ({
          ...preview,
          order: i,
        }));

      // 이미지 제거 시에도 콜백 호출
      onGalleryChange?.(
        newPreviews.map((preview) => ({
          imageUrl: preview.imageUrl,
          alt: preview.alt,
          order: preview.order,
        }))
      );
      return newPreviews;
    });
  };
  return {
    galleryPreviews,
    fileError,
    handleGalleryImageChange,
    removeGalleryImage,
  };
}
