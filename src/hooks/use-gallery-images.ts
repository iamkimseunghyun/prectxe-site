import { ChangeEvent, useState } from 'react';
import { getUploadedProductImageURL } from '@/app/actions/actions';
import { GalleryImage, GalleryPreview } from '@/lib/validations/gallery-image';
import { validateFile } from '@/lib/validateFile';

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
