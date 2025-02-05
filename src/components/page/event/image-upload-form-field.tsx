import { Control } from 'react-hook-form';
import { EventFormType } from '@/lib/validations/event';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import SingleImageBox from '@/components/image/single-image-box';

interface ImageUploadFieldProps {
  control: Control<EventFormType>;
  name: 'mainImageUrl';
  label?: string;
}

const ImageUploadFormField = ({ control, name }: ImageUploadFieldProps) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
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
