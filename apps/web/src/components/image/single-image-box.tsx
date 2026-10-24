'use client';

import { ImagePlus } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type {
  ControllerRenderProps,
  FieldValues,
  RefCallBack,
  UseFormRegisterReturn,
} from 'react-hook-form';

interface ImagePreview {
  url: string;
  isCloudflare: boolean;
}

// Accept either RHF register return or controller field, or a minimal shape used here
type RegisterType =
  | UseFormRegisterReturn
  | ControllerRenderProps<FieldValues, string>
  | { name: string; onBlur: () => void; ref: RefCallBack };

interface SingleImageSectionProps {
  register: RegisterType;
  preview: ImagePreview;
  displayUrl: string | null;
  error?: string;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  inputId?: string;
  aspectRatio?: AspectRatio;
  placeholder?: string;
}

const ImagePlaceholder = ({ text = '사진을 추가해주세요.' }) => (
  <>
    <ImagePlus className="size-8" />
    <div className="text-sm text-neutral-400">
      <p className="mt-2">{text}</p>
    </div>
  </>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="mt-2 text-sm text-red-500">{message}</div>
);

// Tailwind가 클래스를 스캔할 수 있게 전체 문자열로 둔다.
const ASPECT_RATIO_CLASS = {
  square: 'aspect-square',
  video: 'aspect-video',
  landscape: 'aspect-3/2',
} as const;

type AspectRatio = keyof typeof ASPECT_RATIO_CLASS;

const getAspectRatioClass = (ratio: AspectRatio) => ASPECT_RATIO_CLASS[ratio];

const SingleImageBox = ({
  register,
  handleImageChange,
  displayUrl,
  error,
  preview,
  inputId = 'mainImageUrl',
  aspectRatio = 'video',
  placeholder = '사진을 추가해주세요.',
}: SingleImageSectionProps) => {
  const containerClasses = `
    flex items-center justify-center space-y-6 w-full gap-4
  `;

  const labelClasses = `
    flex w-full cursor-pointer flex-col items-center justify-center 
    rounded-md border-2 border-dashed border-neutral-300 
    bg-cover bg-center text-neutral-300
    ${getAspectRatioClass(aspectRatio)}
  `;

  // register prop의 필요한 속성만 추출
  const inputProps = {
    name: register.name,
    onBlur: register.onBlur,
    ref: register.ref,
  };

  return (
    <div className={containerClasses}>
      <label
        htmlFor={inputId}
        className={labelClasses}
        style={{ backgroundImage: displayUrl ? `url(${displayUrl})` : 'none' }}
      >
        {!preview?.url && <ImagePlaceholder text={placeholder} />}
      </label>

      <input
        type="file"
        id={inputId}
        {...inputProps}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
      />

      {error && <ErrorMessage message={error} />}
    </div>
  );
};

export type { ImagePreview, SingleImageSectionProps };
export default SingleImageBox;
