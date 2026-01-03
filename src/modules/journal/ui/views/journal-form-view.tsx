'use client';

import { useEffect, useRef, useState } from 'react';
import SingleImageBox from '@/components/image/single-image-box';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import { toast } from '@/hooks/use-toast';
import { containsKorean, slugify, uploadImage } from '@/lib/utils';

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

type Initial = {
  slug?: string;
  title?: string;
  excerpt?: string | null;
  body?: string | null;
  cover?: string | null;
  tags?: string[];
  publishedAt?: string | null;
};

export function JournalFormView({
  initial,
  onSubmit,
}: {
  initial?: Initial;
  onSubmit: (data: any) => Promise<{ ok?: boolean; error?: string } | void>;
}) {
  const [form, setForm] = useState<Initial>({
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    excerpt: initial?.excerpt ?? '',
    body: initial?.body ?? '',
    cover: initial?.cover ?? '',
    tags: initial?.tags ?? [],
    publishedAt: initial?.publishedAt ?? '',
  });

  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const slugTimer = useRef<any>(null);
  const [intent, setIntent] = useState<'default' | 'continue' | 'new'>(
    'default'
  );
  // 슬러그 수동 편집 여부 추적 (편집 모드거나 사용자가 직접 수정한 경우)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    Boolean(initial?.slug)
  );
  // 제목에 한글이 포함되어 있는지 확인
  const titleHasKorean = containsKorean(form.title || '');

  const handleChange = (k: keyof Initial, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

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

  const {
    preview,
    imageFile,
    error: fileError,
    uploadURL,
    handleImageChange,
    displayUrl,
    finalizeUpload,
  } = useSingleImageUpload({
    initialImage: initial?.cover ?? '',
    onImageUrlChange: (url) => handleChange('cover', url),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugAvailable === false) return;
    if (
      !String(form.title || '').trim() ||
      !String(form.slug || '').trim() ||
      !String(form.body || '').trim()
    ) {
      toast({
        title: '입력 값을 확인해주세요',
        description: '제목/슬러그/본문은 필수입니다.',
      });
      return;
    }
    if (imageFile) {
      await uploadImage(imageFile, uploadURL);
      finalizeUpload();
    }
    const payload = {
      ...form,
      tags: form.tags ?? [],
      intent,
    };
    const res = await onSubmit(payload);
    if (res && (res as any).ok === false) {
      toast({
        title: '오류',
        description: (res as any).error || '저장 중 오류가 발생했습니다.',
      });
    }
  };

  // Slug check
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
        if (initial?.slug) params.set('exclude', initial.slug);
        const res = await fetch(`/api/journal/check-slug?${params.toString()}`);
        const json = await res.json();
        setSlugAvailable(Boolean(json?.available));
      } catch {
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    }, 400);
    return () => slugTimer.current && clearTimeout(slugTimer.current);
  }, [form.slug, initial?.slug, slugAvailable]);

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
            />
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
                <span className="text-red-600">중복된 슬러그입니다.</span>
              )}
            </p>
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
              rows={3}
              value={form.excerpt ?? ''}
              onChange={(e) => handleChange('excerpt', e.target.value)}
            />
          </div>
          <div>
            <Label required>본문</Label>
            <Textarea
              rows={10}
              value={form.body ?? ''}
              onChange={(e) => handleChange('body', e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* 미디어 & 메타 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">미디어 & 메타</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>커버 이미지</Label>
            <SingleImageBox
              register={{ name: 'cover', onBlur: () => {}, ref: () => {} }}
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
                    if (imageFile) {
                      await uploadImage(imageFile, uploadURL);
                      finalizeUpload();
                    }
                  }}
                >
                  업로드 재시도
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <Label>태그 (쉼표 구분)</Label>
              <Input
                value={(form.tags ?? []).join(', ')}
                onChange={(e) =>
                  handleChange(
                    'tags',
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="ex. interview, note, production"
              />
            </div>
            <div>
              <Label>발행일</Label>
              <Input
                type="date"
                value={form.publishedAt ?? ''}
                onChange={(e) => handleChange('publishedAt', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          variant="outline"
          onClick={() => setIntent('new')}
          disabled={slugAvailable === false}
        >
          저장 후 새로 작성
        </Button>
        <Button
          type="submit"
          variant="outline"
          onClick={() => setIntent('continue')}
          disabled={slugAvailable === false}
        >
          저장 후 계속 편집
        </Button>
        <Button
          type="submit"
          onClick={() => setIntent('default')}
          disabled={slugAvailable === false}
        >
          저장
        </Button>
      </div>
    </form>
  );
}
