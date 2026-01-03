'use client';

import { ImagePlus, RotateCcw, X } from 'lucide-react';
import Image from 'next/image';
import type { ChangeEvent } from 'react';
import type {
  ControllerRenderProps,
  UseFormRegisterReturn,
} from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { getImageUrl } from '@/lib/utils';

// Accept either RHF register return or controller field, or a minimal shape used here
type RegisterType =
  | UseFormRegisterReturn
  | ControllerRenderProps<any, string>
  | { name: string; onBlur: () => void; ref: any };
// Core types
interface BaseImage {
  imageUrl: string;
  alt: string;
  order: number;
}

interface ImagePreview extends BaseImage {
  preview: string;
  file: File | null;
  error?: string;
  status?: 'idle' | 'uploading' | 'done' | 'error';
  progress?: number;
}

interface ImagePreviewItemProps {
  preview: ImagePreview;
  index: number;
  register: RegisterType;
  onRemove: () => void;
}

interface MultiImageSectionProps {
  register: RegisterType;
  previews?: ImagePreview[];
  error?: string;
  handleMultiImageChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeMultiImage: (index: number) => void;
  onRetryUpload?: (index: number) => Promise<void>;
}

// Sub-components
const ImagePreviewItem = ({
  preview,
  index,
  register,
  onRemove,
}: ImagePreviewItemProps) => {
  const imageUrl = preview.file
    ? preview.preview
    : getImageUrl(`${preview.imageUrl}`, 'public');

  return (
    <div className="relative aspect-square">
      <Image
        src={imageUrl}
        fill
        alt={preview.alt}
        className="h-full w-full rounded-md object-cover"
        unoptimized={!!preview.file}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      {preview.status === 'uploading' && (
        <div className="absolute inset-0 rounded-md bg-black/30 p-2">
          <div className="absolute bottom-2 left-2 right-2">
            <div className="h-2 w-full overflow-hidden rounded bg-white/20">
              <div
                className="h-2 bg-white/80"
                style={{ width: `${preview.progress ?? 0}%` }}
              />
            </div>
            <div className="mt-1 text-right text-[10px] text-white">
              {preview.progress ?? 0}%
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </button>

      {/* Hidden form fields */}
      <input
        type="hidden"
        {...register}
        name={`images.${index}.imageUrl`}
        value={preview.imageUrl}
      />
      <input
        type="hidden"
        {...register}
        name={`images.${index}.alt`}
        value={preview.alt}
      />
      <input
        type="hidden"
        {...register}
        name={`images.${index}.order`}
        value={preview.order}
      />
    </div>
  );
};

const UploadButton = () => (
  <label
    htmlFor="images"
    className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-neutral-300 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
  >
    <ImagePlus className="h-8 w-8 text-neutral-300" />
    <span className="text-center text-sm text-gray-500">
      Click to upload images
    </span>
  </label>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="mt-2 text-sm text-red-500">{message}</div>
);

// Main component
const MultiImageBox = ({
  register,
  previews = [],
  error,
  handleMultiImageChange,
  removeMultiImage,
  onRetryUpload,
}: MultiImageSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {previews.map((preview, index) => (
          <div key={`${preview.imageUrl}-${index}`} className="relative">
            <ImagePreviewItem
              preview={preview}
              index={index}
              register={register}
              onRemove={() => removeMultiImage(index)}
            />
            {preview.error && onRetryUpload && (
              <div className="absolute bottom-2 right-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2"
                  onClick={() => onRetryUpload(index)}
                >
                  <RotateCcw className="mr-1 h-3 w-3" /> 재시도
                </Button>
              </div>
            )}
          </div>
        ))}
        <UploadButton />
      </div>

      <input
        type="file"
        id="images"
        multiple
        accept="image/*"
        onChange={handleMultiImageChange}
        className="hidden"
      />

      {error && <ErrorMessage message={error} />}
    </div>
  );
};

export default MultiImageBox;

export type { BaseImage, ImagePreview };
