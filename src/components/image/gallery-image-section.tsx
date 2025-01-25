import { UseFormRegister, Path } from 'react-hook-form';

import { ChangeEvent } from 'react';
import { getImageUrl } from '@/lib/utils';
import { ImagePlus, X } from 'lucide-react';
import Image from 'next/image';
import { GalleryPreview } from '@/lib/validations/gallery-image';

// 갤러리 이미지 구조를 정의하는 공통 인터페이스
interface GalleryImage {
  imageUrl: string;
  alt: string;
  order: number;
}

// 제네릭 인터페이스로 수정
interface GalleryImageSectionProps<
  T extends { galleryImageUrls: GalleryImage[] },
> {
  register: UseFormRegister<T>;
  galleryPreviews: GalleryPreview[];
  galleryError?: string;
  handleGalleryImageChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeGalleryImage: (index: number) => void;
}

// 제네릭 컴포넌트로 수정
const GalleryImageSection = <T extends { galleryImageUrls: GalleryImage[] }>({
  register,
  galleryPreviews,
  galleryError,
  handleGalleryImageChange,
  removeGalleryImage,
}: GalleryImageSectionProps<T>) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {galleryPreviews.map((preview, index) => (
          <div key={index} className="relative aspect-square">
            <Image
              src={
                preview.file
                  ? preview.preview
                  : getImageUrl(`${preview.imageUrl}`, 'public')
              }
              fill
              alt={preview.alt}
              className="h-full w-full rounded-md object-cover"
              unoptimized={!!preview.file} // 로컬 프리뷰일 경우 최적화 건너뛰기
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <button
              type="button"
              className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white"
              onClick={() => removeGalleryImage(index)}
            >
              <X className="h-4 w-4" />
            </button>
            <input
              type="hidden"
              {...register(`galleryImageUrls.${index}.imageUrl` as Path<T>)}
              value={preview.imageUrl}
            />
            <input
              type="hidden"
              {...register(`galleryImageUrls.${index}.alt` as Path<T>)}
              value={preview.alt}
            />
            <input
              type="hidden"
              {...register(`galleryImageUrls.${index}.order` as Path<T>)}
              value={preview.order}
            />
          </div>
        ))}
        <label
          htmlFor="gallery-images"
          className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-neutral-300"
        >
          <ImagePlus className="h-8 w-8 text-neutral-300" />
          <span className="text-center text-sm text-gray-500">
            Click to upload venue images
          </span>
        </label>
      </div>
      <input
        type="file"
        id="gallery-images"
        multiple
        accept="image/*"
        onChange={handleGalleryImageChange}
        className="hidden"
      />
      {galleryError && (
        <div className="mt-2 text-sm text-red-500">{galleryError}</div>
      )}
    </div>
  );
};

export default GalleryImageSection;
