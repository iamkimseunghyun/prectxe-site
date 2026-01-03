'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import SingleImageBox from '@/components/image/single-image-box';
import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import { uploadImage } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

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

  const handleChange = (k: keyof Initial, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">제목</label>
          <Input
            value={form.title as any}
            onChange={(e) => handleChange('title', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">슬러그</label>
          <Input
            value={form.slug as any}
            onChange={(e) => handleChange('slug', e.target.value)}
            required
            aria-invalid={slugAvailable === false}
          />
          <p className="mt-1 text-xs">
            {slugChecking && (
              <span className="text-muted-foreground">확인 중…</span>
            )}
            {slugAvailable === true && !slugChecking && (
              <span className="text-green-600">사용 가능한 슬러그입니다.</span>
            )}
            {slugAvailable === false && !slugChecking && (
              <span className="text-red-600">중복된 슬러그입니다.</span>
            )}
          </p>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm">요약</label>
        <Textarea
          rows={3}
          value={form.excerpt ?? ''}
          onChange={(e) => handleChange('excerpt', e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">본문</label>
        <Textarea
          rows={10}
          value={form.body ?? ''}
          onChange={(e) => handleChange('body', e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm">커버</label>
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
        <div>
          <label className="mb-2 block text-sm">태그(쉼표 구분)</label>
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
          <label className="mb-1 mt-4 block text-sm">발행일</label>
          <Input
            type="date"
            value={form.publishedAt ?? ''}
            onChange={(e) => handleChange('publishedAt', e.target.value)}
          />
        </div>
      </div>
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
