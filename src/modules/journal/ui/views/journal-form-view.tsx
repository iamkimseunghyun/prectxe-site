'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import SingleImageBox from '@/components/image/single-image-box';
import { RichEditor } from '@/components/rich-editor';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import { toast } from '@/hooks/use-toast';
import { containsKorean, getImageUrl, slugify, uploadImage } from '@/lib/utils';

const STANDARD_TAGS = [
  { value: 'tech-note', label: 'Tech Note' },
  { value: 'scene-report', label: 'Scene Report' },
  { value: 'archive', label: 'Archive' },
] as const;

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
  isFeatured?: boolean;
  programId?: string | null;
};

type ProgramOption = {
  id: string;
  title: string;
};

export function JournalFormView({
  initial,
  onSubmit,
  programs,
}: {
  initial?: Initial;
  onSubmit: (
    data: any
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
  programs?: ProgramOption[];
}) {
  const [form, setForm] = useState<Initial>({
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    excerpt: initial?.excerpt ?? '',
    body: initial?.body ?? '',
    cover: initial?.cover ?? '',
    tags: initial?.tags ?? [],
    publishedAt: initial?.publishedAt ?? '',
    isFeatured: initial?.isFeatured ?? false,
    programId: initial?.programId ?? null,
  });

  // 공개 상태 (publishedAt이 있으면 공개)
  const [isPublished, setIsPublished] = useState(Boolean(initial?.publishedAt));

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
  // 미리보기 모달 상태
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (k: keyof Initial, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  // 공개/비공개 토글 핸들러
  const handlePublishToggle = (checked: boolean) => {
    setIsPublished(checked);
    if (checked) {
      // 공개: 현재 날짜로 설정
      const today = new Date().toISOString().split('T')[0];
      handleChange('publishedAt', today);
    } else {
      // 비공개: null로 설정
      handleChange('publishedAt', null);
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
      const uploadSuccess = await uploadImage(imageFile, uploadURL);
      if (!uploadSuccess) {
        toast({
          title: '이미지 업로드 실패',
          description: '이미지를 업로드하는 중 오류가 발생했습니다.',
        });
        return;
      }
      finalizeUpload();
    }
    const payload = {
      ...form,
      tags: form.tags ?? [],
      intent,
    };
    const res = await onSubmit(payload);
    if (res && (res as any).success === false) {
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
            <RichEditor
              content={form.body ?? ''}
              onChange={(html) => handleChange('body', html)}
              placeholder="본문을 입력하세요..."
            />
          </div>
        </CardContent>
      </Card>

      {/* 태그 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">태그</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>카테고리</Label>
            <div className="flex flex-wrap gap-3">
              {STANDARD_TAGS.map((tag) => (
                <label key={tag.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={(form.tags ?? []).includes(tag.value)}
                    onCheckedChange={(checked: boolean) => {
                      const current = form.tags ?? [];
                      handleChange(
                        'tags',
                        checked
                          ? [...current, tag.value]
                          : current.filter((t) => t !== tag.value)
                      );
                    }}
                  />
                  <span className="text-sm">{tag.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>자유 태그</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(form.tags ?? [])
                .filter((t) => !STANDARD_TAGS.some((st) => st.value === t))
                .map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() =>
                        handleChange(
                          'tags',
                          (form.tags ?? []).filter((t) => t !== tag)
                        )
                      }
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
            <Input
              placeholder="태그 입력 후 Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = e.currentTarget.value.trim().toLowerCase();
                  if (val && !(form.tags ?? []).includes(val)) {
                    handleChange('tags', [...(form.tags ?? []), val]);
                  }
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 프로그램 연결 */}
      {programs && programs.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">프로그램 연결</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>관련 프로그램</Label>
            <select
              value={form.programId ?? ''}
              onChange={(e) =>
                handleChange('programId', e.target.value || null)
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">선택 안 함</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

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
              <Label>공개 설정</Label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => handlePublishToggle(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">
                  {isPublished ? '비공개' : '공개'}
                </span>
              </label>
              {isPublished && form.publishedAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  발행일: {form.publishedAt}
                </p>
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

      {/* 미리보기 모달 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>미리보기</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 커버 이미지 */}
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg">
              <Image
                src={displayUrl || getImageUrl(null, 'public')}
                alt={form.title || '미리보기'}
                fill
                className="object-cover"
              />
            </div>

            {/* 제목 */}
            <h1 className="text-3xl font-bold">{form.title || '제목 없음'}</h1>

            {/* 메타 정보 */}
            {form.publishedAt && (
              <div className="text-sm text-muted-foreground">
                <time>{form.publishedAt}</time>
              </div>
            )}

            {/* 요약 */}
            {form.excerpt && (
              <p className="text-lg text-muted-foreground">{form.excerpt}</p>
            )}

            {/* 본문 */}
            {form.body && (
              <div
                className="prose prose-neutral dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: form.body }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
