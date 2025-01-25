import { FieldValues, UseFormRegister } from 'react-hook-form';

import { ChangeEvent } from 'react';
import { ImagePlus } from 'lucide-react';

interface ImagePreview {
  url: string;
  type: 'cloudflare' | 'local';
}

interface SingleImageSectionProps<T extends FieldValues> {
  register: UseFormRegister<T>;
  preview: ImagePreview;
  displayUrl: string | null;
  fileError?: string;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const SingleImageSection = <T extends FieldValues>({
  register,
  handleImageChange,
  displayUrl,
  fileError,
  preview,
}: SingleImageSectionProps<T>) => {
  return (
    <div className="flex items-center justify-center space-y-6">
      <label
        htmlFor="mainImageUrl"
        className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-neutral-300 bg-cover bg-center text-neutral-300"
        style={{ backgroundImage: displayUrl ? `url(${displayUrl})` : 'none' }}
      >
        {preview?.url === '' ? (
          <>
            <ImagePlus className="size-8" />
            <div className="text-sm text-neutral-400">
              <p className="mt-2">사진을 추가해주세요.</p>
            </div>
          </>
        ) : null}
      </label>
      <input
        type="file"
        id="mainImageUrl"
        {...register}
        onChange={handleImageChange}
        className="hidden"
      />
      {fileError && (
        <div className="mt-2 text-sm text-red-500">{fileError}</div>
      )}
    </div>
  );
};

export default SingleImageSection;
