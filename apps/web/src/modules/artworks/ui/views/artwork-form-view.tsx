'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { SortableMediaList } from '@/components/media/sortable-media-list';
import { FormActionBar } from '@/components/shared/form-action-bar';
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
import { useFormSubmit } from '@/hooks/use-form-submit';
import { useSortableImages } from '@/hooks/use-sortable-images';
import {
  type CreateArtworkInput,
  createArtworkSchema,
  type UpdateArtworkInput,
} from '@/lib/schemas';
import ArtistSelect from '@/modules/artists/ui/components/artist-select';
import {
  createArtwork,
  updateArtwork,
} from '@/modules/artworks/server/actions';

interface ArtworkFormProps {
  mode: 'create' | 'edit';
  initialData?: CreateArtworkInput | UpdateArtworkInput;
  artworkId?: string;
  artists?: { id: string; name: string; mainImageUrl: string | null }[];
}

const ArtworkFormView = ({
  mode,
  initialData,
  artworkId,
  artists,
}: ArtworkFormProps) => {
  const router = useRouter();
  const { run, notifyInvalid, activeIntent, isSubmitting } = useFormSubmit();

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

  const form = useForm<
    z.input<typeof createArtworkSchema>,
    unknown,
    z.output<typeof createArtworkSchema>
  >({
    resolver: zodResolver(createArtworkSchema),
    defaultValues,
    resetOptions: { keepDirtyValues: true, keepErrors: true },
  });

  const { items, setItems, addImages, removeMedia, uploadPending } =
    useSortableImages(initialData?.images ?? []);

  const onSubmit = form.handleSubmit(
    (data) =>
      run(
        async () => {
          const result = await uploadPending();
          if (!result.ok) {
            return {
              success: false,
              error: '일부 이미지를 업로드하지 못했습니다. 다시 시도해 주세요.',
            };
          }

          const payload = { ...data, images: result.images };
          const saved =
            mode === 'edit'
              ? await updateArtwork(payload, artworkId as string)
              : await createArtwork(payload);

          if (!saved.success) return { success: false, error: saved.error };
          return { success: true, redirect: `/artworks/${saved.data?.id}` };
        },
        { successMessage: '작품을 저장했습니다.' }
      ),
    () => notifyInvalid('표시된 항목을 확인해주세요.')
  );

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
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            field.onChange(v === '' ? undefined : Number(v));
                          }}
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

            <CardFooter>
              <FormActionBar
                className="w-full"
                isSubmitting={isSubmitting}
                activeIntent={activeIntent}
                submitLabel={mode === 'edit' ? '수정하기' : '등록하기'}
                onCancel={() => router.back()}
              />
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default ArtworkFormView;
