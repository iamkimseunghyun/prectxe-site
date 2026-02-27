'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import MultiImageBox from '@/components/image/multi-image-box';
import SingleImageBox from '@/components/image/single-image-box';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMultiImageUpload } from '@/hooks/use-multi-image-upload';
import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import { toast } from '@/hooks/use-toast';
import {
  type ProgramCreateInput,
  ProgramStatusEnum,
  ProgramTypeEnum,
} from '@/lib/schemas/program';
import {
  containsKorean,
  formatArtistName,
  formatEventDate,
  getImageUrl,
  slugify,
  uploadImage,
} from '@/lib/utils';
import ArtistSelect from '@/modules/artists/ui/components/artist-select';

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1 block text-sm font-medium">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

type Credit = {
  artistId: string;
  artist: {
    id: string;
    name: string;
    nameKr?: string | null;
    mainImageUrl: string | null;
  };
  role: string;
};

export function ProgramFormView({
  initial,
  onSubmit,
}: {
  initial?: Partial<ProgramCreateInput> & { id?: string };
  onSubmit: (
    data: any
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
}) {
  const [form, setForm] = useState<Partial<ProgramCreateInput>>({
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    summary: initial?.summary ?? '',
    description: initial?.description ?? '',
    type: (initial?.type as any) ?? 'exhibition',
    status: (initial?.status as any) ?? 'upcoming',
    startAt: (initial?.startAt as any) ?? '',
    endAt: (initial?.endAt as any) ?? '',
    city: initial?.city ?? '',
    heroUrl: initial?.heroUrl ?? '',
    venue: initial?.venue ?? '',
    organizer: initial?.organizer ?? '',
    isFeatured: initial?.isFeatured ?? false,
  });

  // 공개 상태 (status가 draft가 아니면 공개)
  const [isPublished, setIsPublished] = useState(initial?.status !== 'draft');

  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const slugTimer = useRef<any>(null);
  const [intent, setIntent] = useState<'default' | 'continue' | 'new'>(
    'default'
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 슬러그 수동 편집 여부 추적 (편집 모드거나 사용자가 직접 수정한 경우)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    Boolean(initial?.slug)
  );
  // 제목에 한글이 포함되어 있는지 확인
  const titleHasKorean = containsKorean(form.title || '');
  // 미리보기 모달 상태
  const [showPreview, setShowPreview] = useState(false);

  const [credits, setCredits] = useState<Credit[]>(
    (initial as any)?.credits ?? []
  );

  const {
    multiImagePreview,
    handleMultiImageChange,
    removeMultiImage,
    error: galleryError,
    markAllAsUploaded,
    uploadPendingWithProgress,
    retryAtWithProgress,
  } = useMultiImageUpload({
    initialImages: (initial as any)?.images,
  });

  const {
    preview,
    imageFile,
    error: fileError,
    uploadURL,
    handleImageChange,
    displayUrl,
    finalizeUpload,
    retryUpload,
  } = useSingleImageUpload({
    initialImage: initial?.heroUrl ?? '',
    onImageUrlChange: (url) => handleChange('heroUrl', url),
  });

  const handleChange = (key: keyof ProgramCreateInput, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  // 공개/비공개 토글 핸들러
  const handlePublishToggle = (checked: boolean) => {
    setIsPublished(checked);
    if (checked) {
      // 공개: upcoming 또는 completed 상태로 변경 (기존 상태 유지 또는 upcoming)
      const newStatus = form.status === 'completed' ? 'completed' : 'upcoming';
      handleChange('status', newStatus);
    } else {
      // 비공개: draft 상태로 변경
      handleChange('status', 'draft');
    }
  };

  // 제목 변경 시 자동 슬러그 생성
  const handleTitleChange = (title: string) => {
    handleChange('title', title);
    // 슬러그가 수동 편집되지 않았으면 자동 생성 시도
    if (!slugManuallyEdited) {
      const generatedSlug = slugify(title);
      if (generatedSlug) {
        handleChange('slug', generatedSlug);
      }
    }
  };

  // 슬러그 직접 편집 시
  const handleSlugChange = (slug: string) => {
    handleChange('slug', slug);
    setSlugManuallyEdited(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (slugAvailable === false) return;
    // Client-side validation
    const errs: Record<string, string> = {};
    if (!String(form.title || '').trim()) errs.title = '제목을 입력하세요';
    const slug = String(form.slug || '').trim();
    if (!slug) errs.slug = '슬러그를 입력하세요';
    else if (!/^[a-z0-9-]{3,}$/.test(slug))
      errs.slug = '소문자/숫자/하이픈, 3자 이상';
    if (!form.type) errs.type = '유형을 선택하세요';
    if (!form.startAt) errs.startAt = '시작일을 입력하세요';
    if (
      form.startAt &&
      form.endAt &&
      new Date(String(form.endAt)) < new Date(String(form.startAt))
    ) {
      errs.endAt = '종료일은 시작일 이후여야 합니다';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({
        title: '입력 값을 확인해주세요',
        description: '필수 항목을 채워주세요.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      // upload hero image if picked
      if (imageFile) {
        await uploadImage(imageFile, uploadURL);
        finalizeUpload();
      }

      // upload gallery images if any (only ones with a file to avoid re-uploads)
      const { successCount, failCount } = await uploadPendingWithProgress();
      if (failCount > 0) {
        toast({
          title: '일부 이미지 업로드 실패',
          description: `${failCount}개 실패, 재시도해 주세요.`,
        });
      }

      const payload: any = {
        ...form,
        images: multiImagePreview.map((p: any, i: number) => ({
          imageUrl: p.imageUrl || p.url,
          alt: p.alt ?? '',
          order: i,
        })),
        credits: credits.map((c) => ({ artistId: c.artistId, role: c.role })),
        intent,
      };
      const res = await onSubmit(payload);
      if (res && (res as any).success === false) {
        toast({
          title: '오류',
          description: (res as any).error || '저장 중 오류가 발생했습니다.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Slug uniqueness check (debounced)
  useEffect(() => {
    if (!form.slug) {
      if (slugAvailable !== null) setSlugAvailable(null);
      return;
    }
    if (slugTimer.current) clearTimeout(slugTimer.current);
    slugTimer.current = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const params = new URLSearchParams({ slug: String(form.slug) });
        if (initial?.id) params.set('excludeId', initial.id);
        const res = await fetch(
          `/api/programs/check-slug?${params.toString()}`
        );
        const json = await res.json();
        setSlugAvailable(Boolean(json?.available));
      } catch {
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    }, 400);
    return () => slugTimer.current && clearTimeout(slugTimer.current);
  }, [form.slug, initial?.id, slugAvailable]);

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required>제목</Label>
            <Input
              value={form.title as any}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              aria-invalid={!!fieldErrors.title}
            />
            {fieldErrors.title && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>
            )}
          </div>
          <div>
            <Label required>슬러그</Label>
            <Input
              value={form.slug as any}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              aria-invalid={slugAvailable === false}
              placeholder={
                titleHasKorean ? '영문 슬러그를 입력하세요' : undefined
              }
            />
            <p className="mt-1 text-xs">
              {titleHasKorean && !form.slug && (
                <span className="text-amber-600">
                  영문 슬러그를 입력하세요 (예: exhibition-opening)
                </span>
              )}
              {slugChecking && (
                <span className="text-muted-foreground">확인 중…</span>
              )}
              {slugAvailable === true && !slugChecking && (
                <span className="text-green-600">
                  사용 가능한 슬러그입니다.
                </span>
              )}
              {slugAvailable === false && !slugChecking && (
                <span className="text-red-600">
                  중복된 슬러그입니다. 다른 값을 입력하세요.
                </span>
              )}
              {fieldErrors.slug && (
                <span className="ml-2 text-red-600">{fieldErrors.slug}</span>
              )}
            </p>
          </div>
          <div>
            <Label required>유형</Label>
            <Select
              value={form.type as any}
              onValueChange={(v) => handleChange('type', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="유형" />
              </SelectTrigger>
              <SelectContent>
                {ProgramTypeEnum.options.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.type && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.type}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 일정 & 장소 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">일정 & 장소</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required>시작일</Label>
            <Input
              type="date"
              value={form.startAt as any}
              onChange={(e) => handleChange('startAt', e.target.value)}
              required
              aria-invalid={!!fieldErrors.startAt}
            />
            {fieldErrors.startAt && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.startAt}</p>
            )}
          </div>
          <div>
            <Label>종료일</Label>
            <Input
              type="date"
              value={form.endAt as any}
              onChange={(e) => handleChange('endAt', e.target.value)}
              aria-invalid={!!fieldErrors.endAt}
            />
            {fieldErrors.endAt && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.endAt}</p>
            )}
          </div>
          <div>
            <Label>도시</Label>
            <Input
              value={form.city as any}
              onChange={(e) => handleChange('city', e.target.value)}
            />
          </div>
          <div>
            <Label>장소</Label>
            <Input
              value={form.venue as any}
              onChange={(e) => handleChange('venue', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 콘텐츠 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">콘텐츠</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>요약</Label>
            <Textarea
              value={form.summary as any}
              onChange={(e) => handleChange('summary', e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <Label>설명</Label>
            <Textarea
              value={form.description as any}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* 미디어 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">미디어</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>대표 이미지</Label>
            <SingleImageBox
              register={{ name: 'heroUrl', onBlur: () => {}, ref: () => {} }}
              preview={preview}
              displayUrl={displayUrl}
              error={fileError}
              handleImageChange={handleImageChange}
              aspectRatio="video"
            />
            {fileError && (
              <div className="mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await retryUpload(async (file: File, url: string) => {
                      const fd = new FormData();
                      fd.append('file', file);
                      await fetch(url, { method: 'POST', body: fd });
                    });
                  }}
                >
                  업로드 재시도
                </Button>
              </div>
            )}
          </div>
          <div>
            <Label>갤러리 이미지</Label>
            <MultiImageBox
              register={{ name: 'images', onBlur: () => {}, ref: () => {} }}
              previews={multiImagePreview as any}
              handleMultiImageChange={handleMultiImageChange}
              removeMultiImage={removeMultiImage}
              error={galleryError}
              onRetryUpload={async (idx) => {
                await retryAtWithProgress(idx);
              }}
            />
            {galleryError && (
              <p className="mt-1 text-xs text-red-600">{galleryError}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 크레딧 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">크레딧</CardTitle>
        </CardHeader>
        <CardContent>
          <ArtistSelect
            value={
              credits.map(({ artistId, artist }) => ({
                artistId,
                artist,
              })) as any
            }
            onChange={(arr: any[]) => {
              // 새 선택값과 기존 role을 머지
              setCredits((prev) => {
                const map = new Map(prev.map((c) => [c.artistId, c] as const));
                return arr.map((x: any) =>
                  map.has(x.artistId)
                    ? {
                        ...map.get(x.artistId)!,
                        artistId: x.artistId,
                        artist: x.artist,
                      }
                    : { artistId: x.artistId, artist: x.artist, role: 'artist' }
                );
              });
            }}
          />

          {credits.length > 0 && (
            <div className="mt-3 space-y-2">
              {credits.map((c, idx) => (
                <div
                  key={c.artistId}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {formatArtistName(c.artist.nameKr as any, c.artist.name)}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        역할
                      </span>
                      <Input
                        value={c.role}
                        onChange={(e) =>
                          setCredits((prev) => {
                            const next = [...prev];
                            next[idx] = { ...prev[idx], role: e.target.value };
                            return next;
                          })
                        }
                        placeholder="artist / curator / vj ..."
                        className="h-8 max-w-[240px]"
                      />
                      <div className="flex flex-wrap gap-1">
                        {[
                          'artist',
                          'curator',
                          'vj',
                          'dj',
                          'producer',
                          'performer',
                          'writer',
                          'composer',
                        ].map((r) => (
                          <button
                            key={r}
                            type="button"
                            className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                            onClick={() =>
                              setCredits((prev) => {
                                const next = [...prev];
                                next[idx] = { ...prev[idx], role: r };
                                return next;
                              })
                            }
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="크레딧 제거"
                    onClick={() =>
                      setCredits((prev) =>
                        prev.filter((p) => p.artistId !== c.artistId)
                      )
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 발행 설정 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">발행 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>공개 설정</Label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => handlePublishToggle(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">{isPublished ? '비공개' : '공개'}</span>
            </label>
            {isPublished && (
              <div className="mt-2">
                <Label>상태</Label>
                <Select
                  value={form.status as any}
                  onValueChange={(v) => handleChange('status', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">upcoming</SelectItem>
                    <SelectItem value="completed">completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div>
            <Label>메인 노출 설정</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="featured"
                checked={form.isFeatured as boolean}
                onCheckedChange={(checked: boolean) =>
                  handleChange('isFeatured', Boolean(checked))
                }
              />
              <label
                htmlFor="featured"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                메인 페이지에 노출
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowPreview(true)}
        >
          미리보기
        </Button>
        <Button
          type="submit"
          variant="outline"
          onClick={() => setIntent('new')}
          disabled={isSubmitting || slugAvailable === false}
        >
          저장 후 새로 작성
        </Button>
        <Button
          type="submit"
          variant="outline"
          onClick={() => setIntent('continue')}
          disabled={isSubmitting || slugAvailable === false}
        >
          저장 후 계속 편집
        </Button>
        <Button
          type="submit"
          onClick={() => setIntent('default')}
          disabled={isSubmitting || slugAvailable === false}
        >
          저장
        </Button>
      </div>

      {/* 미리보기 모달 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>미리보기</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 대표 이미지 */}
            {(displayUrl || form.heroUrl) && (
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg">
                <Image
                  src={
                    displayUrl || getImageUrl(form.heroUrl as string, 'public')
                  }
                  alt={form.title || '미리보기'}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* 제목 */}
            <h1 className="text-3xl font-bold">{form.title || '제목 없음'}</h1>

            {/* 메타 정보 */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
              {form.startAt && (
                <span>
                  {formatEventDate(
                    new Date(form.startAt as string),
                    form.endAt
                      ? new Date(form.endAt as string)
                      : new Date(form.startAt as string)
                  )}
                </span>
              )}
              {(form.city || form.venue) && (
                <span>
                  {[form.city, form.venue].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>

            {/* 요약 또는 설명 */}
            {(form.summary || form.description) && (
              <p className="whitespace-pre-line leading-relaxed text-neutral-700">
                {form.summary || form.description}
              </p>
            )}

            {/* 크레딧 */}
            {credits.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-neutral-500">
                  Credits
                </h2>
                <ul className="space-y-2">
                  {credits.map((c) => (
                    <li key={c.artistId} className="flex items-center gap-3">
                      <span className="text-sm">
                        {formatArtistName(c.artist.nameKr, c.artist.name)}
                      </span>
                      <span className="text-xs text-neutral-400">{c.role}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 갤러리 이미지 */}
            {multiImagePreview.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-neutral-500">
                  Gallery
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {multiImagePreview.map((img: any, idx: number) => (
                    <div
                      key={idx}
                      className="relative aspect-video overflow-hidden rounded-lg"
                    >
                      <Image
                        src={img.url || getImageUrl(img.imageUrl, 'public')}
                        alt={img.alt || `Gallery ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
