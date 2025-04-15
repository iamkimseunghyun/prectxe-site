'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import SingleImageBox from '@/components/image/single-image-box';
import { Button } from '@/components/ui/button';

import MultiImageBox from '@/components/image/multi-image-box';
import { uploadGalleryImages, uploadSingleImage } from '@/lib/utils';

import { useMultiImageUpload } from '@/hooks/use-multi-image-upload';
import FormSubmitButton from '@/components/layout/form-submit-button';
import {
  CreateArtistInput,
  createArtistSchema,
  ImageData,
  UpdateArtistInput,
} from '@/lib/schemas';
import { createArtist, updateArtist } from '@/modules/artists/server/actions';

type ArtistFormProps = {
  mode: 'create' | 'edit';
  initialData?: CreateArtistInput | UpdateArtistInput;
  artistId?: string;
  userId?: string;
};

const ArtistFormView = ({
  mode,
  initialData,
  artistId,
  userId,
}: ArtistFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues = {
    name: initialData?.name ?? '',
    nameKr: initialData?.nameKr ?? '',
    mainImageUrl: initialData?.mainImageUrl ?? '',
    email: initialData?.email ?? '',
    city: initialData?.city ?? '',
    country: initialData?.country ?? '',
    homepage: initialData?.homepage ?? '',
    biography: initialData?.biography ?? '',
    cv: initialData?.cv ?? '',
    images: initialData?.images ?? [],
  };

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateArtistInput>({
    resolver: zodResolver(createArtistSchema),
    defaultValues,
  });

  // 싱글 이미지 업로드 훅
  const {
    preview,
    imageFile,
    error: fileError,
    uploadURL,
    handleImageChange,
    imageUrl,
    displayUrl,
  } = useSingleImageUpload({
    initialImage: initialData?.mainImageUrl ?? '',
    onImageUrlChange: (url) => {
      setValue('mainImageUrl', url);
    },
  });

  // 갤러리 이미지 훅
  const { multiImagePreview, error, handleMultiImageChange, removeMultiImage } =
    useMultiImageUpload({
      initialImages: initialData?.images,
      onGalleryChange: (galleryData) => {
        setValue('images', galleryData);
      },
    });

  const prepareFormData = (
    data: CreateArtistInput,
    galleryData: ImageData[]
  ) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('nameKr', data.nameKr);
    formData.append('mainImageUrl', imageUrl);
    formData.append('email', data.email ?? '');
    formData.append('city', data.city ?? '');
    formData.append('country', data.country ?? '');
    formData.append('homepage', data.homepage ?? '');
    formData.append('biography', data.biography ?? '');
    formData.append('cv', data.cv ?? '');
    formData.append('images', JSON.stringify(galleryData));
    return formData;
  };

  const onSubmit = handleSubmit(async (data: CreateArtistInput) => {
    setIsSubmitting(true);
    try {
      if (imageFile) {
        await uploadSingleImage(imageFile, uploadURL);
      }
      if (multiImagePreview.length > 0) {
        await uploadGalleryImages(multiImagePreview);
      }

      const formData = prepareFormData(data, data.images);

      const result =
        mode === 'edit'
          ? await updateArtist(formData, artistId!)
          : await createArtist(formData, userId!);

      // 에러 처리 수정
      if (!result.ok) return new Error(result.error);
      router.push(`/artists/${result.data?.id}`);
    } catch (error) {
      console.error('Error: ', error);
      setError('root', {
        message: error instanceof Error ? error.message : '아티스트 등록 실패',
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
            {mode === 'create' ? '아티스트 등록' : '아티스트 수정'}
          </CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit} className="space-y-8">
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label>영문 이름</label>
                <Input placeholder="아티스트 이름" {...register('name')} />
                {errors.name && (
                  <p id="name-error" className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label>한글 이름</label>
                <Input placeholder="아티스트 이름" {...register('nameKr')} />
                {errors.nameKr && (
                  <p id="nameKr-error" className="text-sm text-destructive">
                    {errors.nameKr.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label>이메일</label>
                <Input placeholder="email@example.com" {...register('email')} />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label>홈페이지</label>
                <Input
                  placeholder="https://example.com"
                  {...register('homepage')}
                />
                {errors.homepage && (
                  <p id="homepage-error" className="text-sm text-destructive">
                    {errors.homepage.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <p>프로필 사진</p>
                <SingleImageBox
                  register={register('mainImageUrl')}
                  preview={preview}
                  error={fileError}
                  displayUrl={displayUrl}
                  aspectRatio="square"
                  handleImageChange={handleImageChange}
                />
              </div>
              <div className="space-y-2">
                <p>추가 사진</p>
                <MultiImageBox
                  register={register('images')}
                  previews={multiImagePreview}
                  handleMultiImageChange={handleMultiImageChange}
                  removeMultiImage={removeMultiImage}
                  error={error}
                />
              </div>
              <div className="space-y-2">
                <label>도시</label>
                <Input placeholder="도시" {...register('city')} />
                {errors.city && (
                  <p id="city-error" className="text-sm text-destructive">
                    {errors.city.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label>국가</label>
                <Input placeholder="국가" {...register('country')} />
                {errors.country && (
                  <p id="country-error" className="text-sm text-destructive">
                    {errors.country.message}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 *:my-4">
              <label>작가 소개</label>
              <Textarea
                placeholder="아티스트의 약력을 입력해주세요."
                {...register('biography')}
                rows={15}
              />
              {errors.biography && (
                <p id="biography-error" className="text-sm text-destructive">
                  {errors.biography.message}
                </p>
              )}

              <label>C.V</label>
              <Textarea
                placeholder="아티스트의 이력서를 입력해주세요."
                {...register('cv')}
                rows={15}
              />
              {errors.cv && (
                <p id="cv-error" className="text-sm text-destructive">
                  {errors.cv.message}
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

export default ArtistFormView;
