'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin } from 'lucide-react';
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
  type CreateVenueInput,
  createVenueSchema,
  type UpdateVenueInput,
} from '@/lib/schemas';
import { createVenue, updateVenue } from '@/modules/venues/server/actions';

type VenueFormProps = {
  mode: 'create' | 'edit';
  initialData?: CreateVenueInput | UpdateVenueInput;
  venueId?: string;
  userId?: string;
};

const VenueFormView = ({
  mode,
  initialData,
  venueId,
  userId,
}: VenueFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<CreateVenueInput>({
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
    markAllAsUploaded,
    retryAtWithProgress,
    uploadPendingWithProgress,
  } = useMultiImageUpload({
    initialImages: initialData?.images,
    onGalleryChange: (galleryData) => {
      form.setValue('images', galleryData);
    },
  });

  const onSubmit = form.handleSubmit(
    async (data: z.infer<typeof createVenueSchema>) => {
      setIsSubmitting(true);
      try {
        const { successCount, failCount } = await uploadPendingWithProgress();
        if (failCount > 0) {
          form.setError('root', {
            message: `${failCount}개 이미지 업로드 실패. 재시도 하세요.`,
          });
        }

        const result =
          mode === 'edit'
            ? await updateVenue(data, venueId!)
            : await createVenue(data, userId!);

        // throw 대신 return 사용
        if (!result.ok) return new Error(result.error);
        router.push(`/venues/${result.data?.id}`);
      } catch (error) {
        console.error('Error: ', error);
        form.setError('root', {
          message: error instanceof Error ? error.message : '장소 등록 실패',
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  );
  /*  const onValid = async () => {
    await onSubmit();
  };*/
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? '장소 등록' : '장소 수정'}</CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">
                      장소 이름
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="장소 이름을 입력하세요."
                        {...field}
                        type="text"
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
                    <FormLabel className="text-sm font-medium">소개</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="장소에 대해 간단히 설명해주세요."
                        rows={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">주소</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Input {...field} placeholder="주소를 입력해주세요." />
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 갤러리 이미지 섹션 */}
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">
                      장소 사진
                    </FormLabel>
                    <FormControl>
                      <MultiImageBox
                        register={field}
                        previews={multiImagePreview}
                        handleMultiImageChange={handleMultiImageChange}
                        removeMultiImage={removeMultiImage}
                        error={fileError}
                        onRetryUpload={async (idx) => {
                          await retryAtWithProgress(idx);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                disabled={isSubmitting}
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

export default VenueFormView;
