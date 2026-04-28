'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import SingleImageBox from '@/components/image/single-image-box';
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
import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import { useSortableImages } from '@/hooks/use-sortable-images';
import { useToast } from '@/hooks/use-toast';
import {
  type CreateArtistInput,
  createArtistSchema,
  type UpdateArtistInput,
} from '@/lib/schemas';
import { uploadSingleImage } from '@/lib/utils';
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
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const defaultValues = {
    name: initialData?.name ?? '',
    nameKr: initialData?.nameKr ?? '',
    mainImageUrl: initialData?.mainImageUrl ?? '',
    email: initialData?.email ?? '',
    city: initialData?.city ?? '',
    country: initialData?.country ?? '',
    homepage: initialData?.homepage ?? '',
    instagram: initialData?.instagram ?? '',
    soundcloud: initialData?.soundcloud ?? '',
    bandcamp: initialData?.bandcamp ?? '',
    youtube: initialData?.youtube ?? '',
    spotify: initialData?.spotify ?? '',
    tagline: initialData?.tagline ?? '',
    tags: initialData?.tags ?? [],
    biography: initialData?.biography ?? '',
    cv: initialData?.cv ?? '',
    images: initialData?.images ?? [],
  };

  const form = useForm<CreateArtistInput>({
    // zod 4: input/output 타입 차이로 인한 type-cast (transform/default/optional 혼용 schema)
    resolver: zodResolver(createArtistSchema) as Resolver<CreateArtistInput>,
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

  // 갤러리 이미지 — Drop과 동일한 SortableMediaList 패턴
  const {
    items: galleryItems,
    setItems: setGalleryItems,
    addImages: addGalleryImages,
    removeMedia: removeGalleryImage,
    uploadPending: uploadGallery,
  } = useSortableImages(initialData?.images ?? []);

  const onSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      // 1. 메인 이미지 업로드
      if (imageFile) {
        await uploadSingleImage(imageFile, uploadURL);
        finalizeUpload();
      }

      // 2. 갤러리 pending 업로드
      const uploaded = await uploadGallery();
      if (!uploaded.ok) {
        toast({
          title: '이미지 업로드 실패',
          description: '일부 파일을 다시 시도해 주세요.',
          variant: 'destructive',
        });
        return;
      }

      // 3. 서버 액션 호출
      const payload = { ...data, images: uploaded.images };
      const result =
        mode === 'edit'
          ? await updateArtist(payload, artistId as string)
          : await createArtist(payload, userId as string);

      if (!result.success) throw new Error(result.error);
      router.push(`/artists/${result.data?.id}`);
    } catch (error) {
      console.error('Error: ', error);
      form.setError('root', {
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
                <FormItem className="md:col-span-2">
                  <FormLabel>추가 사진</FormLabel>
                  <FormControl>
                    <SortableMediaList
                      items={galleryItems}
                      onReorder={setGalleryItems}
                      onRemove={removeGalleryImage}
                      onAddImages={addGalleryImages}
                      disabled={isSubmitting}
                      heroNote="드래그해 순서를 조정하세요. 아티스트 상세의 갤러리 섹션에 표시됩니다."
                      sizeNote="이미지 1장당 10MB 이하. 여러 개 업로드 가능."
                    />
                  </FormControl>
                </FormItem>

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
                  name="tagline"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>한 줄 소개</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="예: Seoul-based sound artist exploring noise and silence"
                          maxLength={120}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        카드·상세 페이지 상단에 표시됩니다 (최대 120자).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                      <FormItem className="md:col-span-2">
                        <FormLabel>태그</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input
                              placeholder="장르·역할 입력 후 Enter (예: Visual Artist, Electronic)"
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
                  name="biography"
                  render={({ field }) => (
                    <FormItem className="mt-4 md:col-span-2">
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
                    <FormItem className="mt-4 md:col-span-2">
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

                <div className="mt-4 space-y-4 md:col-span-2">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Links
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      전체 URL을 입력하세요. 비어 있는 항목은 상세 페이지에
                      표시되지 않습니다.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="homepage"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>홈페이지</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="instagram"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
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
                    <FormField
                      control={form.control}
                      name="soundcloud"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>SoundCloud</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://soundcloud.com/..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bandcamp"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>Bandcamp</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://....bandcamp.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="youtube"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>YouTube</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://youtube.com/@..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="spotify"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>Spotify</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://open.spotify.com/artist/..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
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
