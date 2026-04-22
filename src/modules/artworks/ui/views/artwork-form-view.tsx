'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import FormSubmitButton from '@/components/layout/form-submit-button';
import { SortableMediaList } from '@/components/media/sortable-media-list';
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
import { useSortableImages } from '@/hooks/use-sortable-images';
import { useToast } from '@/hooks/use-toast';
import {
  type Artwork,
  type CreateArtworkInput,
  createArtworkSchema,
  type UpdateArtworkInput,
} from '@/lib/schemas';
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
  const { toast } = useToast();
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
    resetOptions: { keepDirtyValues: true, keepErrors: true },
  });

  const { items, setItems, addImages, removeMedia, uploadPending } =
    useSortableImages(initialData?.images ?? []);

  const onSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      const result = await uploadPending();
      if (!result.ok) {
        toast({
          title: '이미지 업로드 실패',
          description: '일부 파일을 다시 시도해 주세요.',
          variant: 'destructive',
        });
        return;
      }

      const payload = { ...data, images: result.images };
      const saved =
        mode === 'edit'
          ? await updateArtwork(payload, artworkId as string)
          : await createArtwork(payload, userId as string);

      if (!saved.success) throw new Error(saved.error);
      router.push(`/artworks/${saved.data?.id}`);
    } catch (error) {
      console.error('Error:', error);
      form.setError('root', {
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
          <CardTitle className="text-xl font-medium">
            {mode === 'create' ? '작품 등록' : '작품 수정'}
          </CardTitle>
          <CardDescription>작품 정보와 이미지를 입력해주세요.</CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="artists"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>작가</FormLabel>
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
                  <FormItem>
                    <FormLabel>작품 제목</FormLabel>
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>연도</FormLabel>
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
                    <FormItem>
                      <FormLabel>규격</FormLabel>
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
                    <FormItem>
                      <FormLabel>재료</FormLabel>
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
                    <FormItem>
                      <FormLabel>유형</FormLabel>
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

              <FormItem>
                <FormLabel>작품 이미지</FormLabel>
                <FormControl>
                  <SortableMediaList
                    items={items}
                    onReorder={setItems}
                    onRemove={removeMedia}
                    onAddImages={addImages}
                    disabled={isSubmitting}
                    heroNote="맨 앞 이미지가 목록/상세/OG의 대표 이미지로 사용됩니다. 드래그해 순서를 조정하세요."
                    sizeNote="이미지 1장당 10MB 이하. 여러 개 업로드 가능."
                  />
                </FormControl>
              </FormItem>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>작품 설명</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="작품에 대한 간단한 설명을 입력하세요"
                        rows={10}
                        value={field.value ?? ''}
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
              >
                {mode === 'edit' ? '수정하기' : '등록하기'}
              </FormSubmitButton>
            </CardFooter>
            {form.formState.errors.root && (
              <p className="px-6 pb-4 text-sm text-red-500">
                {form.formState.errors.root.message}
              </p>
            )}
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default ArtworkFormView;
