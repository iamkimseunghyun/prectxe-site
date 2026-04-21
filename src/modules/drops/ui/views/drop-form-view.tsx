'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  type MediaItem,
  SortableMediaList,
} from '@/components/media/sortable-media-list';
import { RichEditor } from '@/components/rich-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  getCloudflareImageUrl,
  getCloudflareVideoUploadUrl,
} from '@/lib/cdn/cloudflare';
import validateImageFile from '@/lib/utils';
import {
  createDrop,
  deleteDrop,
  updateDrop,
} from '@/modules/drops/server/actions';

type DropMediaInit = {
  id: string;
  type: 'image' | 'video';
  url: string;
  alt: string;
  order: number;
};

type DropData = {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  summary: string | null;
  description: string | null;
  eventDate: Date | null;
  eventEndDate: Date | null;
  venue: string | null;
  venueAddress: string | null;
  notice: string | null;
  publishedAt: Date | null;
  media?: DropMediaInit[];
};

interface DropFormViewProps {
  drop?: DropData;
}

/**
 * XHR로 파일 업로드 + 진행률 콜백.
 * Cloudflare direct-upload(image/video) 모두 동일한 multipart POST 형식.
 */
function uploadFileWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    });
    xhr.addEventListener('load', () =>
      resolve(xhr.status >= 200 && xhr.status < 300)
    );
    xhr.addEventListener('error', () => resolve(false));
    xhr.addEventListener('abort', () => resolve(false));

    const fd = new FormData();
    fd.append('file', file);
    xhr.open('POST', url);
    xhr.send(fd);
  });
}

export function DropFormView({ drop }: DropFormViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!drop;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [description, setDescription] = useState(drop?.description ?? '');

  // Select 상태 (controlled — Radix name prop이 React 19 form에서 무한루프 유발)
  const [type, setType] = useState(drop?.type ?? 'ticket');
  const [status, setStatus] = useState(drop?.status ?? 'draft');

  // 통합 미디어 상태 — 이미지/영상 혼합, 드래그 정렬 가능
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(
    (drop?.media ?? []).map((m) => ({
      id: m.id,
      type: m.type,
      url: m.url,
      preview: m.url,
      file: null,
      alt: m.alt,
      status: 'done',
    }))
  );

  function updateItem(id: string, patch: Partial<MediaItem>) {
    setMediaItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }

  async function addImages(files: FileList) {
    for (const file of Array.from(files)) {
      try {
        validateImageFile(file);
      } catch (err) {
        toast({
          title: err instanceof Error ? err.message : '이미지 검증 실패',
          variant: 'destructive',
        });
        continue;
      }

      const preview = URL.createObjectURL(file);
      const tempId = preview;
      setMediaItems((prev) => [
        ...prev,
        {
          id: tempId,
          type: 'image',
          url: '',
          preview,
          file,
          alt: '',
          status: 'pending',
        },
      ]);

      try {
        const { uploadURL, imageUrl } = await getCloudflareImageUrl();
        updateItem(tempId, { uploadURL, url: imageUrl });
      } catch {
        updateItem(tempId, {
          status: 'error',
          error: '업로드 URL 발급 실패',
        });
      }
    }
  }

  async function addVideos(files: FileList) {
    for (const file of Array.from(files)) {
      if (file.size > 200 * 1024 * 1024) {
        toast({
          title: `'${file.name}': 영상은 200MB 이하만 가능합니다.`,
          variant: 'destructive',
        });
        continue;
      }

      const preview = URL.createObjectURL(file);
      const tempId = preview;
      setMediaItems((prev) => [
        ...prev,
        {
          id: tempId,
          type: 'video',
          url: '',
          preview,
          file,
          alt: '',
          status: 'pending',
        },
      ]);

      try {
        const result = await getCloudflareVideoUploadUrl();
        if (!result.success || !result.uploadURL || !result.videoUrl) {
          updateItem(tempId, {
            status: 'error',
            error: '업로드 URL 발급 실패',
          });
          continue;
        }
        updateItem(tempId, {
          uploadURL: result.uploadURL,
          url: result.videoUrl,
        });
      } catch {
        updateItem(tempId, {
          status: 'error',
          error: '업로드 URL 발급 실패',
        });
      }
    }
  }

  function removeMedia(id: string) {
    setMediaItems((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // pending 미디어 업로드 (진행률 추적)
      const pending = mediaItems.filter(
        (m) => m.file && m.uploadURL && m.status !== 'done'
      );
      for (const item of pending) {
        updateItem(item.id, { status: 'uploading', progress: 0 });
        const ok = await uploadFileWithProgress(
          item.uploadURL!,
          item.file!,
          (p) => updateItem(item.id, { progress: p })
        );
        if (ok) {
          updateItem(item.id, { status: 'done', progress: 100 });
        } else {
          updateItem(item.id, { status: 'error', error: '업로드 실패' });
          toast({
            title: `미디어 업로드에 실패했습니다.`,
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      }

      // media 배열 구성 (순서 = mediaItems 배열 순서)
      const media = mediaItems
        .filter((m) => m.url)
        .map((m, idx) => ({
          type: m.type,
          url: m.url,
          alt: m.alt,
          order: idx,
        }));

      const fd = new FormData(e.currentTarget);
      const payload = {
        title: fd.get('title') as string,
        slug: fd.get('slug') as string,
        type: fd.get('type') as 'ticket' | 'goods',
        summary: (fd.get('summary') as string) || undefined,
        description: description || undefined,
        eventDate: (fd.get('eventDate') as string) || undefined,
        eventEndDate: (fd.get('eventEndDate') as string) || undefined,
        venue: (fd.get('venue') as string) || undefined,
        venueAddress: (fd.get('venueAddress') as string) || undefined,
        notice: (fd.get('notice') as string) || undefined,
        status: fd.get('status') as string,
        media,
      };

      const result = isEdit
        ? await updateDrop(drop.id, payload)
        : await createDrop(payload);

      if (result.success) {
        toast({
          title: isEdit ? 'Drop이 수정되었습니다.' : 'Drop이 생성되었습니다.',
        });
        if (isEdit) {
          router.push(`/admin/drops/${drop.id}`);
        } else if (result.data) {
          router.push(`/admin/drops/${result.data.id}`);
        }
      } else {
        toast({ title: result.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!drop || !confirm('이 Drop을 삭제하시겠습니까?')) return;
    setIsDeleting(true);
    const result = await deleteDrop(drop.id);
    if (result.success) {
      toast({ title: 'Drop이 삭제되었습니다.' });
      router.push('/admin/drops');
    } else {
      toast({ title: result.error, variant: 'destructive' });
      setIsDeleting(false);
    }
  }

  async function handlePublish() {
    if (!drop) return;
    const now = new Date().toISOString();
    const result = await updateDrop(drop.id, {
      status: 'on_sale',
      publishedAt: now,
    });
    if (result.success) {
      toast({ title: '공개되었습니다.' });
      router.refresh();
    } else {
      toast({ title: result.error, variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/drops">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">
          {isEdit ? drop.title : '새 Drop'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="title">
                      제목 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={drop?.title ?? ''}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">
                      Slug <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="slug"
                      name="slug"
                      defaultValue={drop?.slug ?? ''}
                      placeholder="url-friendly-name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="type">
                    유형 <span className="text-red-500">*</span>
                  </Label>
                  <input type="hidden" name="type" value={type} />
                  <Select
                    value={type}
                    onValueChange={setType}
                    disabled={isEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ticket">티켓</SelectItem>
                      <SelectItem value="goods">굿즈</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="summary">요약</Label>
                  <Input
                    id="summary"
                    name="summary"
                    defaultValue={drop?.summary ?? ''}
                    placeholder="짧은 소개 문구"
                  />
                </div>

                <div>
                  <Label>상세 설명</Label>
                  <RichEditor
                    content={description}
                    onChange={setDescription}
                    placeholder="Drop의 상세 설명을 입력하세요..."
                    minHeight="300px"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="eventDate">행사 시작일</Label>
                    <Input
                      id="eventDate"
                      name="eventDate"
                      type="datetime-local"
                      defaultValue={
                        drop?.eventDate
                          ? new Date(drop.eventDate).toISOString().slice(0, 16)
                          : ''
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="eventEndDate">행사 종료일</Label>
                    <Input
                      id="eventEndDate"
                      name="eventEndDate"
                      type="datetime-local"
                      defaultValue={
                        drop?.eventEndDate
                          ? new Date(drop.eventEndDate)
                              .toISOString()
                              .slice(0, 16)
                          : ''
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="venue">장소</Label>
                    <Input
                      id="venue"
                      name="venue"
                      defaultValue={drop?.venue ?? ''}
                      placeholder="예: 홍대 무브홀"
                    />
                  </div>
                  <div>
                    <Label htmlFor="venueAddress">주소</Label>
                    <Input
                      id="venueAddress"
                      name="venueAddress"
                      defaultValue={drop?.venueAddress ?? ''}
                      placeholder="예: 서울시 마포구..."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notice">안내사항</Label>
                  <Textarea
                    id="notice"
                    name="notice"
                    defaultValue={drop?.notice ?? ''}
                    rows={4}
                    placeholder="입장 안내, 환불 정책, 주의사항 등"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 미디어 (통합·DnD 정렬) */}
            <Card>
              <CardHeader>
                <CardTitle>미디어</CardTitle>
              </CardHeader>
              <CardContent>
                <SortableMediaList
                  items={mediaItems}
                  onReorder={setMediaItems}
                  onRemove={removeMedia}
                  onAddImages={addImages}
                  onAddVideos={addVideos}
                  disabled={isSubmitting}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>상태</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input type="hidden" name="status" value={status} />
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">초안</SelectItem>
                    <SelectItem value="upcoming">예정</SelectItem>
                    <SelectItem value="on_sale">판매 중</SelectItem>
                    <SelectItem value="sold_out">매진</SelectItem>
                    <SelectItem value="closed">종료</SelectItem>
                  </SelectContent>
                </Select>

                {isEdit && drop.status === 'draft' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handlePublish}
                  >
                    공개하기
                  </Button>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEdit ? '저장' : '생성'}
                </Button>

                {isEdit && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? '삭제 중...' : '삭제'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
