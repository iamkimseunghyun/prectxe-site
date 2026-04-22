'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import FormSubmitButton from '@/components/layout/form-submit-button';
import { SortableMediaList } from '@/components/media/sortable-media-list';
import { Badge } from '@/components/ui/badge';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSortableImages } from '@/hooks/use-sortable-images';
import { useToast } from '@/hooks/use-toast';
import { type CreateVenueInput, createVenueSchema } from '@/lib/schemas';
import { createVenue, updateVenue } from '@/modules/venues/server/actions';

type VenueInitial = {
  name?: string | null;
  tagline?: string | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  instagram?: string | null;
  tags?: string[] | null;
  images?: {
    id?: string;
    imageUrl: string;
    alt: string;
    order: number;
  }[];
};

type VenueFormProps = {
  mode: 'create' | 'edit';
  initialData?: VenueInitial;
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
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const defaultValues: CreateVenueInput = {
    name: initialData?.name ?? '',
    tagline: initialData?.tagline ?? '',
    description: initialData?.description ?? '',
    address: initialData?.address ?? '',
    city: initialData?.city ?? '',
    country: initialData?.country ?? '',
    website: initialData?.website ?? '',
    instagram: initialData?.instagram ?? '',
    tags: initialData?.tags ?? [],
    images: initialData?.images ?? [],
  };

  const form = useForm<CreateVenueInput>({
    resolver: zodResolver(createVenueSchema),
    defaultValues,
    resetOptions: { keepErrors: true, keepDirtyValues: true },
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
          ? await updateVenue(payload, venueId as string)
          : await createVenue(payload, userId as string);

      if (!saved.success) throw new Error(saved.error);
      router.push(`/venues/${saved.data?.id}`);
    } catch (error) {
      console.error('Error:', error);
      form.setError('root', {
        message: error instanceof Error ? error.message : '장소 등록 실패',
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
            {mode === 'create' ? '장소 등록' : '장소 수정'}
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>장소 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="예: UNDERCITY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tagline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>한 줄 소개</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="예: 성수동의 언더그라운드 뮤직 라이브하우스"
                        maxLength={120}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      카드·상세 상단에 표시됩니다 (최대 120자).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>주소</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="예: 서울시 성동구 성수이로 ..."
                          {...field}
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
                    <FormItem>
                      <FormLabel>도시</FormLabel>
                      <FormControl>
                        <Input placeholder="서울" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>국가</FormLabel>
                      <FormControl>
                        <Input placeholder="Korea" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => {
                  const tags: string[] = field.value ?? [];
                  const commit = (raw: string) => {
                    const tag = raw.trim().replace(/,$/, '');
                    if (!tag) return;
                    if (tags.length >= 10) return;
                    if (tags.includes(tag)) return;
                    field.onChange([...tags, tag]);
                    setTagInput('');
                  };
                  return (
                    <FormItem>
                      <FormLabel>태그</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            placeholder="유형 입력 후 Enter (예: 라이브하우스, 갤러리)"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                commit(tagInput);
                              }
                            }}
                            onBlur={() => {
                              if (tagInput.trim()) commit(tagInput);
                            }}
                          />
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {tags.map((t) => (
                                <Badge
                                  key={t}
                                  variant="secondary"
                                  className="gap-1 pr-1"
                                >
                                  {t}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      field.onChange(
                                        tags.filter((x) => x !== t)
                                      )
                                    }
                                    className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                                    aria-label={`${t} 제거`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        최대 10개. 쉼표 또는 Enter로 추가됩니다.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>소개</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="장소에 대한 자세한 설명"
                        rows={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>장소 사진</FormLabel>
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

              <div className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Links
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    전체 URL을 입력하세요. 비어 있는 항목은 상세 페이지에
                    표시되지 않습니다.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>웹사이트</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://instagram.com/..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                disabled={isSubmitting}
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

export default VenueFormView;
