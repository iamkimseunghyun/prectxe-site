'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useMultiImageUpload } from '@/hooks/use-multi-image-upload';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

import { uploadGalleryImages } from '@/lib/utils';
import MultiImageBox from '@/components/image/multi-image-box';
import FormSubmitButton from '@/components/form-submit-button';
import {
  CreateVenueInput,
  createVenueSchema,
  ImageData,
  Venue,
} from '@/lib/schemas';
import { createVenue, updateVenue } from '@/app/(page)/venues/actions';

type VenueFormProps = {
  mode: 'create' | 'edit';
  initialData?: CreateVenueInput;
  venueId?: string;
  userId?: string;
};

const VenueForm = ({ mode, initialData, venueId, userId }: VenueFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<CreateVenueInput>({
    resolver: zodResolver(createVenueSchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      address: '',
      images: [],
    },
    resetOptions: {
      keepErrors: true,
      keepDirtyValues: true, // 변경된 값 유지
    },
  });

  // 갤러리 이미지 훅
  const {
    multiImagePreview,
    error: fileError,
    handleMultiImageChange,
    removeMultiImage,
  } = useMultiImageUpload({
    initialImages: initialData?.images,
    onGalleryChange: (galleryData) => {
      setValue('images', galleryData);
    },
  });

  const prepareFormData = (
    data: CreateVenueInput,
    galleryData: ImageData[]
  ) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('address', data.address);
    formData.append('images', JSON.stringify(galleryData));
    return formData;
  };

  const onSubmit = handleSubmit(async (data: Venue) => {
    setIsSubmitting(true);
    try {
      if (multiImagePreview.length > 0) {
        await uploadGalleryImages(multiImagePreview);
      }
      // 기존 이미지와 새 이미지를 합쳐서 FormData 생성
      const formData = prepareFormData(data, data.images);

      const result =
        mode === 'edit'
          ? await updateVenue(formData, venueId!)
          : await createVenue(formData, userId!);

      if (!result.ok) throw new Error(result.error);
      router.push(`/venues/${result.data?.id}`);
    } catch (error) {
      console.error('Error: ', error);
      setError('root', {
        message: error instanceof Error ? error.message : '장소 등록 실패',
      });
    } finally {
      setIsSubmitting(false);
    }
  });
  /*  const onValid = async () => {
    await onSubmit();
  };*/
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? '장소 등록' : '장소 수정'}</CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">장소 이름</label>
              <Input
                placeholder="장소 이름을 입력하세요."
                {...register('name')}
                type="text"
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">소개</label>
              <Textarea
                {...register('description')}
                placeholder="장소에 대해 간단히 설명해주세요."
                rows={10}
              />
              {errors.description && (
                <span className="text-sm text-red-500">
                  {errors.description.message}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <div className="flex gap-2">
                <Input
                  {...register('address')}
                  placeholder="주소를 입력해주세요."
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    /* Implement map selection */
                  }}
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              {errors.address && (
                <span className="text-sm text-red-500">
                  {errors.address.message}
                </span>
              )}
            </div>

            {/* 갤러리 이미지 섹션 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">장소 사진</label>
              <MultiImageBox
                register={register('images')}
                previews={multiImagePreview}
                handleMultiImageChange={handleMultiImageChange}
                removeMultiImage={removeMultiImage}
                error={fileError}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              취소
            </Button>
            <FormSubmitButton
              type="submit"
              loading={isSubmitting}
              loadingText={mode === 'edit' ? '수정하기' : '등록하기'}
            >
              {mode === 'edit' ? '수정하기' : '등록하기'}
            </FormSubmitButton>
          </CardFooter>
          {errors.root && (
            <p className="text-sm text-red-500">{errors.root.message}</p>
          )}
        </form>
      </Card>
    </div>
  );
};

export default VenueForm;
