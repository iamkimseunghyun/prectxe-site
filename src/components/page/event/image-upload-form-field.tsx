import { Control, useFormContext } from 'react-hook-form';
import { EventFormType } from '@/lib/validations/event';
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import SingleImageBox from '@/components/image/single-image-box';
import { useFormSingleImageUpload } from '@/hooks/use-form-single-upload';

interface ImageUploadFieldProps {
  control: Control<EventFormType>;
  name: 'mainImageUrl';
  label?: string;
}

const ImageUploadFormField = ({
  control,
  name,
  label = '이미지',
}: ImageUploadFieldProps) => {
  const { setValue } = useFormContext<EventFormType>();
  const {
    preview,
    error: uploadError,
    handleImageChange,
    displayUrl,
  } = useFormSingleImageUpload({
    onImageUrlChange: (url: string) => {
      setValue(name, url, { shouldValidate: true, shouldDirty: true });
    },
  });
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <SingleImageBox
            register={field}
            preview={preview}
            displayUrl={displayUrl}
            error={uploadError}
            handleImageChange={handleImageChange}
            inputId={name}
            aspectRatio="video"
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ImageUploadFormField;
