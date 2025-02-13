import { ChangeEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import { ControllerRenderProps, UseFormRegisterReturn } from 'react-hook-form';

interface ImagePreview {
  url: string;
  isCloudflare: boolean;
}

// Register 타입을 유니온 타입으로 변경
type RegisterType = UseFormRegisterReturn | ControllerRenderProps<any, string>;

interface SingleImageSectionProps {
  register: RegisterType;
  preview: ImagePreview;
  displayUrl: string | null;
  error?: string;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  inputId?: string;
  aspectRatio?: 'square' | 'video';
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

const getAspectRatioClass = (ratio: 'square' | 'video') =>
  ratio === 'square' ? 'aspect-square' : 'aspect-video';

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
    flex items-center justify-center space-y-6 grid grid-cols-3 gap-4
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
