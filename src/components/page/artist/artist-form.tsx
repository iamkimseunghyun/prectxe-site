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
import React from 'react';
import { GalleryImage } from '@/lib/validations/gallery-image';
import { artistCreateSchema, ArtistFormData } from '@/lib/validations/artist';
import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import SingleImageBox from '@/components/image/single-image-box';
import { Button } from '@/components/ui/button';

import MultiImageBox from '@/components/image/multi-image-box';
import {
  formatDate,
  formatDateForInput,
  uploadGalleryImages,
  uploadSingleImage,
} from '@/lib/utils';
import { createArtist, updateArtist } from '@/app/artists/actions';
import { useMultiImageUpload } from '@/hooks/use-multi-image-upload';

type ArtistFormProps = {
  mode: 'create' | 'edit';
  initialData?: ArtistFormData;
  artistId?: string;
};

const ArtistForm = ({ mode, initialData, artistId }: ArtistFormProps) => {
  const router = useRouter();

  const defaultValues = initialData
    ? {
        ...initialData,
        birth: formatDateForInput(initialData.birth),
      }
    : {
        name: '',
        mainImageUrl: '',
        birth: formatDate(new Date()),
        nationality: '',
        city: '',
        country: '',
        email: '',
        homepage: '',
        biography: '',
        cv: '',
        images: [],
      };
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ArtistFormData>({
    resolver: zodResolver(artistCreateSchema),
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
    data: ArtistFormData,
    galleryData: GalleryImage[]
  ) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('mainImageUrl', imageUrl);
    formData.append('birth', data.birth ?? '');
    formData.append('nationality', data.nationality ?? '');
    formData.append('city', data.city ?? '');
    formData.append('country', data.country ?? '');
    formData.append('email', data.email ?? '');
    formData.append('homepage', data.homepage ?? '');
    formData.append('biography', data.biography ?? '');
    formData.append('cv', data.cv ?? '');
    formData.append('images', JSON.stringify(galleryData));
    return formData;
  };

  const onSubmit = handleSubmit(async (data: ArtistFormData) => {
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
          : await createArtist(formData);

      // 에러 처리 수정
      if (!result.ok) throw new Error(result.error);
      router.push(`/artists/${result.data?.id}`);
    } catch (error) {
      console.error('Error: ', error);
      setError('root', {
        message: error instanceof Error ? error.message : '아티스트 등록 실패',
      });
    }
  });

  return (
    <div className="container mx-auto py-10">
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
                <label>이름</label>
                <Input placeholder="아티스트 이름" {...register('name')} />
                {errors.name && (
                  <p id="name-error" className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <SingleImageBox
                register={register('mainImageUrl')}
                preview={preview}
                error={fileError}
                displayUrl={displayUrl}
                handleImageChange={handleImageChange}
              />
              <MultiImageBox
                register={register('images')}
                previews={multiImagePreview}
                handleMultiImageChange={handleMultiImageChange}
                removeMultiImage={removeMultiImage}
                error={error}
              />
              <div className="space-y-2">
                <label>생년월일</label>
                <Input type="date" {...register('birth')} />
                {errors.birth && (
                  <p id="birth-error" className="text-sm text-destructive">
                    {errors.birth.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label>국적</label>
                  <Input placeholder="국적" {...register('nationality')} />
                </div>
                {errors.nationality && (
                  <p
                    id="nationality-error"
                    className="text-sm text-destructive"
                  >
                    {errors.nationality.message}
                  </p>
                )}

                <div className="space-y-2">
                  <label>국가</label>
                  <Input placeholder="국가" {...register('country')} />
                </div>
                {errors.country && (
                  <p id="country-error" className="text-sm text-destructive">
                    {errors.country.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label>도시</label>
                <Input placeholder="도시" {...register('city')} />
              </div>
              <div className="space-y-2">
                <label>이메일</label>
                <Input placeholder="email@example.com" {...register('email')} />
              </div>
              <div className="space-y-2">
                <label>홈페이지</label>
                <Input
                  placeholder="https://example.com"
                  {...register('homepage')}
                />
              </div>
            </div>
            <div className="mt-4 *:my-4">
              <label>작가 소개</label>
              <Textarea
                placeholder="아티스트의 약력을 입력해주세요."
                {...register('biography')}
                rows={6}
              />

              <label>C.V</label>
              <Textarea
                placeholder="아티스트의 이력서를 입력해주세요."
                {...register('cv')}
                rows={6}
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

export default ArtistForm;
