'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

import {
  createArtworkSchema,
  CreateArtworkType,
  UpdateArtworkType,
} from '@/app/artworks/artwork';
import { createArtwork, updateArtwork } from '@/app/artworks/actions';
import { useMultiImageUpload } from '@/hooks/use-multi-image-upload';
import { uploadGalleryImages } from '@/lib/utils';
import MultiImageBox from '@/components/image/multi-image-box';

import FormSubmitButton from '@/components/form-submit-button';
import ArtistSelect from '@/components/page/artist/artist-select';
import { ImageData } from '@/lib/schemas';

type ArtworkFormProps = {
  mode: 'create' | 'edit';
  initialData?: CreateArtworkType | UpdateArtworkType;
  artworkId?: string;
  userId?: string;
  artists?: { id: string; name: string; mainImageUrl: string | null }[];
};

const ArtWorkForm = ({
  mode,
  initialData,
  artworkId,
  userId,
  artists,
}: ArtworkFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues = {
    title: initialData?.title ?? '',
    size: initialData?.size ?? '',
    media: initialData?.media ?? '',
    year: initialData?.year ?? new Date().getFullYear(),
    description: initialData?.description ?? '',
    style: initialData?.style ?? '',
    images: initialData?.images ?? [],
    artists: initialData?.artists ?? [],
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<CreateArtworkType>({
    resolver: zodResolver(createArtworkSchema),
    defaultValues,
    resetOptions: {
      keepDirtyValues: true,
      keepErrors: true,
    },
  });

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
    data: CreateArtworkType,
    galleryData: ImageData[]
  ) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('size', data.size ?? '');
    formData.append('media', data.media ?? '');
    formData.append('year', data.year?.toString() ?? '');
    formData.append('description', data.description ?? '');
    formData.append('style', data.style ?? '');
    formData.append('images', JSON.stringify(galleryData));
    formData.append('artists', JSON.stringify(data.artists));
    return formData;
  };

  const onSubmit = handleSubmit(async (data: CreateArtworkType) => {
    setIsSubmitting(true);
    try {
      if (multiImagePreview.length > 0) {
        await uploadGalleryImages(multiImagePreview);
      }

      const formData = prepareFormData(data, data.images);

      const result =
        mode === 'edit'
          ? await updateArtwork(formData, artworkId!)
          : await createArtwork(formData, userId!);

      if (!result.ok) throw new Error(result.error);
      router.push(`/artworks/${result.data?.id}`);
    } catch (error) {
      console.error(error);
      setError('root', {
        message: error instanceof Error ? error.message : '작품 등록 실패',
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {mode === 'create' ? '작품 정보 등록' : '작품 정보 수정'}
          </CardTitle>
          <CardDescription>새로운 작품의 정보를 입력해주세요.</CardDescription>
        </CardHeader>

        <form onSubmit={onSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">작가 선택</label>
                <ArtistSelect
                  artists={artists}
                  value={watch('artists')}
                  onChange={(artists) => setValue('artists', artists)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">작품 제목</label>
                <Input
                  placeholder="작품의 제목을 입력하세요"
                  {...register('title')}
                />
                {errors.title && (
                  <p id="title-error" className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">연도</label>
                  <Input
                    type="number"
                    defaultValue={new Date().getFullYear()}
                    min={1918}
                    max={new Date().getFullYear()}
                    {...register('year', { valueAsNumber: true })}
                  />
                  {errors.year && (
                    <p id="year-error" className="text-sm text-destructive">
                      {errors.year.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">규격</label>
                  <Input type="text" {...register('size')} />
                  {errors.size && (
                    <p id="size-error" className="text-sm text-destructive">
                      {errors.size.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">재료</label>
                  <Input type="text" {...register('media')} />
                  {errors.media && (
                    <p id="media-error" className="text-sm text-destructive">
                      {errors.media.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">유형</label>
                  <Input type="text" {...register('style')} />
                  {errors.style && (
                    <p id="style-error" className="text-sm text-destructive">
                      {errors.style.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* 갤러리 이미지 섹션 */}
            <MultiImageBox
              register={register('images')}
              previews={multiImagePreview}
              error={fileError}
              handleMultiImageChange={handleMultiImageChange}
              removeMultiImage={removeMultiImage}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <Textarea
                {...register('description')}
                placeholder="작품에 대한 간단한 설명을 입력하세요"
                rows={15}
              />
              {errors?.description && (
                <p id="description-error" className="text-sm text-destructive">
                  {errors.description?.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
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

export default ArtWorkForm;
