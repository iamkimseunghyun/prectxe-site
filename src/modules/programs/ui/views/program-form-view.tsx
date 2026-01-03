'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SingleImageBox from '@/components/image/single-image-box';
import MultiImageBox from '@/components/image/multi-image-box';
import { useMultiImageUpload } from '@/hooks/use-multi-image-upload';
import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import {
  formatArtistName,
  uploadImage,
  uploadGalleryImages,
  slugify,
  containsKorean,
} from '@/lib/utils';
import ArtistSelect from '@/modules/artists/ui/components/artist-select';
import { X } from 'lucide-react';
import {
  ProgramCreateInput,
  ProgramStatusEnum,
  ProgramTypeEnum,
} from '@/lib/schemas/program';
import { toast } from '@/hooks/use-toast';

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
  onSubmit: (data: any) => Promise<{ ok?: boolean; error?: string } | void>;
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
  });

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

  const [credits, setCredits] = useState<Credit[]>([]);

  const {
    multiImagePreview,
    handleMultiImageChange,
    removeMultiImage,
    error: galleryError,
    markAllAsUploaded,
    uploadPendingWithProgress,
    retryAtWithProgress,
  } = useMultiImageUpload();

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
      if (res && (res as any).ok === false) {
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">제목</label>
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
          <label className="mb-1 block text-sm">슬러그</label>
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
            {/* 한글 제목일 때 안내 메시지 */}
            {titleHasKorean && !form.slug && (
              <span className="text-amber-600">
                💡 영문 슬러그를 입력하세요 (예: exhibition-opening)
              </span>
            )}
            {slugChecking && (
              <span className="text-muted-foreground">확인 중…</span>
            )}
            {slugAvailable === true && !slugChecking && (
              <span className="text-green-600">사용 가능한 슬러그입니다.</span>
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
          <label className="mb-1 block text-sm">유형</label>
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
        <div>
          <label className="mb-1 block text-sm">상태</label>
          <Select
            value={form.status as any}
            onValueChange={(v) => handleChange('status', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              {ProgramStatusEnum.options.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm">시작일</label>
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
          <label className="mb-1 block text-sm">종료일</label>
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
          <label className="mb-1 block text-sm">도시</label>
          <Input
            value={form.city as any}
            onChange={(e) => handleChange('city', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">장소</label>
          <Input
            value={form.venue as any}
            onChange={(e) => handleChange('venue', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">요약</label>
        <Textarea
          value={form.summary as any}
          onChange={(e) => handleChange('summary', e.target.value)}
          rows={3}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">설명</label>
        <Textarea
          value={form.description as any}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={6}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm">대표 이미지</label>
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
          <label className="mb-2 block text-sm">갤러리 이미지</label>
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
      </div>

      <div>
        <label className="mb-2 block text-sm">크레딧(아티스트 + 역할)</label>
        <ArtistSelect
          value={
            credits.map(({ artistId, artist }) => ({ artistId, artist })) as any
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
                    <span className="text-xs text-muted-foreground">역할</span>
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
      </div>

      <div className="flex justify-end gap-3">
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
    </form>
  );
}
