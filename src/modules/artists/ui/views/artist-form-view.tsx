'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import MultiImageBox from '@/components/image/multi-image-box';
import SingleImageBox from '@/components/image/single-image-box';
import FormSubmitButton from '@/components/layout/form-submit-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMultiImageUpload } from '@/hooks/use-multi-image-upload';
import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import {
  type artistSchema,
  type CreateArtistInput,
  createArtistSchema,
  type UpdateArtistInput,
} from '@/lib/schemas';
import { uploadGalleryImages, uploadSingleImage } from '@/lib/utils';
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

  const form = useForm<CreateArtistInput>({
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
    displayUrl,
    finalizeUpload,
  } = useSingleImageUpload({
    initialImage: initialData?.mainImageUrl ?? '',
    onImageUrlChange: (url) => {
      form.setValue('mainImageUrl', url);
    },
  });

  // 갤러리 이미지 훅
  const {
    multiImagePreview,
    error,
    handleMultiImageChange,
    removeMultiImage,
    markAllAsUploaded,
  } = useMultiImageUpload({
    initialImages: initialData?.images,
    onGalleryChange: (galleryData) => {
      form.setValue('images', galleryData);
    },
  });

  const onSubmit = form.handleSubmit(
    async (data: z.infer<typeof artistSchema>) => {
      setIsSubmitting(true);
      try {
        if (imageFile) {
          await uploadSingleImage(imageFile, uploadURL);
          finalizeUpload();
        }
        const toUpload = multiImagePreview.filter((p) => (p as any).file);
        if (toUpload.length > 0) {
          await uploadGalleryImages(toUpload as any);
          markAllAsUploaded();
        }

        const result =
          mode === 'edit'
            ? await updateArtist(data, artistId!)
            : await createArtist(data, userId!);

        // 에러 처리 수정
        if (!result.ok) return new Error(result.error);
        router.push(`/artists/${result.data?.id}`);
      } catch (error) {
        console.error('Error: ', error);
        form.setError('root', {
          message:
            error instanceof Error ? error.message : '아티스트 등록 실패',
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {mode === 'create' ? '아티스트 등록' : '아티스트 수정'}
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-8">
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>영문 이름</FormLabel>
                      <FormControl>
                        <Input placeholder="아티스트 이름" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nameKr"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>한글 이름</FormLabel>
                      <FormControl>
                        <Input placeholder="아티스트 이름" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="homepage"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>홈페이지</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mainImageUrl"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>프로필 사진</FormLabel>
                      <FormControl>
                        <SingleImageBox
                          register={field}
                          preview={preview}
                          error={fileError}
                          displayUrl={displayUrl}
                          aspectRatio="square"
                          handleImageChange={handleImageChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>추가 사진</FormLabel>
                      <FormControl>
                        <MultiImageBox
                          register={field}
                          previews={multiImagePreview}
                          handleMultiImageChange={handleMultiImageChange}
                          removeMultiImage={removeMultiImage}
                          error={error}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>도시</FormLabel>
                      <FormControl>
                        <Input placeholder="도시" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>국가</FormLabel>
                      <FormControl>
                        <Input placeholder="국가" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="biography"
                  render={({ field }) => (
                    <FormItem className="my-4 mt-4">
                      <FormLabel>작가 소개</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="아티스트의 약력을 입력해주세요."
                          {...field}
                          rows={15}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cv"
                  render={({ field }) => (
                    <FormItem className="my-4 mt-4">
                      <FormLabel>C.V</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="아티스트의 이력서를 입력해주세요."
                          {...field}
                          rows={15}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
            {form.formState.errors.root && (
              <p className="text-sm text-red-500">
                {form.formState.errors.root.message}
              </p>
            )}
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default ArtistFormView;
