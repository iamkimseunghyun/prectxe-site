'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import MultiImageBox from '@/components/image/multi-image-box';
import FormSubmitButton from '@/components/layout/form-submit-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  type Artwork,
  type CreateArtworkInput,
  createArtworkSchema,
  type UpdateArtworkInput,
} from '@/lib/schemas';
import { uploadGalleryImages } from '@/lib/utils';
import ArtistSelect from '@/modules/artists/ui/components/artist-select';
import {
  createArtwork,
  updateArtwork,
} from '@/modules/artworks/server/actions';

type ArtworkFormProps = {
  mode: 'create' | 'edit';
  initialData?: CreateArtworkInput | UpdateArtworkInput;
  artworkId?: string;
  userId?: string;
  artists?: { id: string; name: string; mainImageUrl: string | null }[];
};

const ArtworkFormView = ({
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

  const form = useForm<Artwork>({
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
      form.setValue('images', galleryData);
    },
  });

  const onSubmit = form.handleSubmit(
    async (data: z.infer<typeof createArtworkSchema>) => {
      setIsSubmitting(true);
      try {
        if (multiImagePreview.length > 0) {
          await uploadGalleryImages(multiImagePreview);
        }

        const result =
          mode === 'edit'
            ? await updateArtwork(data, artworkId!)
            : await createArtwork(data, userId!);

        if (!result.ok) return new Error(result.error);
        router.push(`/artworks/${result.data?.id}`);
      } catch (error) {
        console.error(error);
        form.setError('root', {
          message: error instanceof Error ? error.message : '작품 등록 실패',
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
            {mode === 'create' ? '작품 등록' : '작품 수정'}
          </CardTitle>
          <CardDescription>새로운 작품의 정보를 입력해주세요.</CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="artists"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        작가 선택
                      </FormLabel>
                      <FormControl>
                        <ArtistSelect
                          artists={artists}
                          value={field.value || []}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        작품 제목
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="작품의 제목을 입력하세요"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                  style={{ width: '100%' }}
                >
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">
                          연도
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={2018}
                            max={new Date().getFullYear()}
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">
                          규격
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="media"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">
                          재료
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="style"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">
                          유형
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 갤러리 이미지 섹션 */}
                <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        작품 이미지
                      </FormLabel>
                      <FormControl>
                        <MultiImageBox
                          register={field}
                          previews={multiImagePreview}
                          error={fileError}
                          handleMultiImageChange={handleMultiImageChange}
                          removeMultiImage={removeMultiImage}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        작품 설명
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="작품에 대한 간단한 설명을 입력하세요"
                          rows={15}
                          value={field.value ?? ''}
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
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default ArtworkFormView;
