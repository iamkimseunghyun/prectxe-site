'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
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
import { useGalleryImages } from '@/hooks/use-gallery-images';
import GalleryImageSection from '@/components/image/gallery-image-section';
import { GalleryImage, GalleryPreview } from '@/lib/validations/gallery-image';
import {
  artworkCreateSchema,
  ArtworkFormData,
} from '@/lib/validations/artwork';
import {
  createArtwork,
  CreateArtworkResponse,
  updateArtwork,
} from '@/app/artworks/actions';
import { uploadGalleryImages } from '@/lib/utils';

type ArtworkFormProps = {
  mode: 'create' | 'edit';
  initialData?: ArtworkFormData;
  artworkId?: string;
};

const ArtWorkForm = ({ mode, initialData, artworkId }: ArtworkFormProps) => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ArtworkFormData>({
    resolver: zodResolver(artworkCreateSchema),
    defaultValues: initialData || {
      title: '',
      size: '',
      media: '',
      year: new Date().getFullYear(),
      description: '',
      style: '',
      images: [],
    },
    resetOptions: {
      keepDirtyValues: true,
      keepErrors: true,
    },
  });

  // 갤러리 이미지 훅
  const {
    galleryPreviews,
    fileError: galleryError,
    handleGalleryImageChange,
    removeGalleryImage,
  } = useGalleryImages({
    initialImages: initialData?.images,
    onGalleryChange: (galleryData) => {
      setValue('images', galleryData);
    },
  });

  /*
  const uploadGalleryImages = async (previews: GalleryPreview[]) => {
    return Promise.all(
      previews.map(async (preview) => {
        const formData = new FormData();
        formData.append('file', preview.file!);
        const response = await fetch(preview.uploadURL, {
          method: 'POST',
          body: formData,
        });
        if (response.status !== 200) {
          throw new Error(`Failed to upload: ${preview.alt}`);
        }
      })
    );
  };
*/

  const prepareFormData = (
    data: ArtworkFormData,
    galleryData: GalleryImage[]
  ) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('size', data.size);
    formData.append('media', data.media);
    formData.append('year', data.year.toString());
    formData.append('description', data.description);
    formData.append('style', data.style);
    formData.append('images', JSON.stringify(galleryData));
    return formData;
  };

  const onSubmit = handleSubmit(async (data: ArtworkFormData) => {
    try {
      if (galleryPreviews.length > 0) {
        await uploadGalleryImages(galleryPreviews);
      }

      const formData = prepareFormData(data, data.images);

      const result: CreateArtworkResponse =
        mode === 'edit'
          ? await updateArtwork(formData, artworkId!)
          : await createArtwork(formData);

      if (!result.ok) throw new Error(result.error);
      router.push(`/artworks/${result.data?.id}`);
    } catch (error) {
      console.error(error);
      setError('root', {
        message: error instanceof Error ? error.message : '작품 등록 실패',
      });
    }
  });

  return (
    <div className="mx-auto max-w-3xl p-4">
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
            <GalleryImageSection
              register={register}
              galleryPreviews={galleryPreviews}
              galleryError={galleryError}
              handleGalleryImageChange={handleGalleryImageChange}
              removeGalleryImage={removeGalleryImage}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <Textarea
                {...register('description')}
                placeholder="작품에 대한 간단한 설명을 입력하세요"
                rows={6}
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
            >
              취소
            </Button>
            <Button type="submit">
              {mode === 'edit' ? '수정하기' : '등록하기'}
            </Button>
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
