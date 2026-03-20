'use client';

import { ArrowLeft, Loader2, Video } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useState } from 'react';
import SingleImageBox from '@/components/image/single-image-box';
import MultiImageBox from '@/components/image/multi-image-box';
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
import { useMultiImageUpload } from '@/hooks/use-multi-image-upload';
import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import { useToast } from '@/hooks/use-toast';
import { getCloudflareVideoUploadUrl } from '@/lib/cdn/cloudflare';
import { uploadImage } from '@/lib/utils';
import {
  createDrop,
  deleteDrop,
  updateDrop,
} from '@/modules/drops/server/actions';

type DropImage = {
  imageUrl: string;
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
  heroUrl: string | null;
  videoUrl: string | null;
  publishedAt: Date | null;
  images?: DropImage[];
};

interface DropFormViewProps {
  drop?: DropData;
}

export function DropFormView({ drop }: DropFormViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!drop;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 히어로 이미지 (single)
  const [heroUrl, setHeroUrl] = useState(drop?.heroUrl ?? '');
  const {
    preview,
    imageFile,
    error: heroError,
    uploadURL: heroUploadURL,
    handleImageChange: handleHeroChange,
    displayUrl,
    finalizeUpload: finalizeHero,
  } = useSingleImageUpload({
    initialImage: drop?.heroUrl ?? '',
    onImageUrlChange: (url) => setHeroUrl(url),
  });

  // 갤러리 이미지 (multi)
  const [galleryImages, setGalleryImages] = useState<DropImage[]>(
    drop?.images ?? []
  );
  const {
    multiImagePreview,
    handleMultiImageChange,
    removeMultiImage,
    error: galleryError,
    uploadPendingWithProgress,
    retryAtWithProgress,
  } = useMultiImageUpload({
    initialImages: drop?.images,
    onGalleryChange: (imgs) =>
      setGalleryImages(
        imgs.map((i) => ({ imageUrl: i.imageUrl, alt: i.alt, order: i.order }))
      ),
  });

  // Select 상태 (controlled — Radix name prop이 React 19 form에서 무한루프 유발)
  const [type, setType] = useState(drop?.type ?? 'ticket');
  const [status, setStatus] = useState(drop?.status ?? 'draft');

  // 비디오
  const [videoUrl, setVideoUrl] = useState(drop?.videoUrl ?? '');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploadURL, setVideoUploadURL] = useState('');
  const [videoPreview, setVideoPreview] = useState(drop?.videoUrl ?? '');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState('');

  const handleVideoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoError('');

    if (file.size > 200 * 1024 * 1024) {
      setVideoError('비디오 파일은 200MB 이하만 가능합니다.');
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));

    try {
      const result = await getCloudflareVideoUploadUrl();
      if (!result.success || !result.uploadURL || !result.videoUrl) {
        setVideoError('비디오 업로드 URL을 가져올 수 없습니다.');
        return;
      }
      setVideoUploadURL(result.uploadURL);
      setVideoUrl(result.videoUrl);
    } catch {
      setVideoError('비디오 업로드 준비에 실패했습니다.');
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview('');
    setVideoUrl('');
    setVideoUploadURL('');
    setVideoError('');
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const fd = new FormData(e.currentTarget);

    try {
      // 1) 히어로 이미지 업로드
      if (imageFile && heroUploadURL) {
        await uploadImage(imageFile, heroUploadURL);
        finalizeHero();
      }

      // 2) 갤러리 이미지 업로드
      const { failCount, images: uploadedImages } =
        await uploadPendingWithProgress();
      if (failCount > 0) {
        toast({
          title: `${failCount}장의 이미지 업로드에 실패했습니다. 다시 시도해 주세요.`,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // 3) 비디오 업로드
      if (videoFile && videoUploadURL) {
        setVideoUploading(true);
        try {
          const vfd = new FormData();
          vfd.append('file', videoFile);
          await fetch(videoUploadURL, { method: 'POST', body: vfd });
          setVideoFile(null);
          setVideoUploadURL('');
        } catch {
          toast({
            title: '비디오 업로드에 실패했습니다.',
            variant: 'destructive',
          });
        } finally {
          setVideoUploading(false);
        }
      }

      // 4) 서버 액션 호출
      const payload = {
        title: fd.get('title') as string,
        slug: fd.get('slug') as string,
        type: fd.get('type') as 'ticket' | 'goods',
        summary: (fd.get('summary') as string) || undefined,
        description: (fd.get('description') as string) || undefined,
        heroUrl: heroUrl || undefined,
        videoUrl: videoUrl || undefined,
        status: fd.get('status') as string,
        images: uploadedImages,
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
          {/* Main Content */}
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
                  <Label htmlFor="description">상세 설명</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={drop?.description ?? ''}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 미디어 */}
            <Card>
              <CardHeader>
                <CardTitle>미디어</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 히어로 이미지 */}
                <div>
                  <Label>히어로 이미지</Label>
                  <SingleImageBox
                    register={{
                      name: 'heroUrl',
                      onBlur: () => {},
                      ref: () => {},
                    }}
                    preview={preview}
                    displayUrl={displayUrl}
                    error={heroError}
                    handleImageChange={handleHeroChange}
                    inputId="heroImage"
                    aspectRatio="video"
                    placeholder="히어로 이미지를 추가해주세요."
                  />
                </div>

                {/* 비디오 */}
                <div>
                  <Label>영상</Label>
                  {videoPreview ? (
                    <div className="relative mt-1 overflow-hidden rounded-md border bg-black">
                      <video
                        src={videoPreview}
                        controls
                        className="aspect-video w-full"
                      />
                      <button
                        type="button"
                        onClick={removeVideo}
                        className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                      >
                        삭제
                      </button>
                      {videoUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <label
                      htmlFor="videoInput"
                      className="mt-1 flex aspect-video cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-neutral-300 text-neutral-300 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
                    >
                      <Video className="h-8 w-8" />
                      <span className="mt-2 text-sm text-neutral-400">
                        영상을 추가해주세요.
                      </span>
                    </label>
                  )}
                  <input
                    type="file"
                    id="videoInput"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                  />
                  {videoError && (
                    <p className="mt-1 text-sm text-red-500">{videoError}</p>
                  )}
                </div>

                {/* 갤러리 이미지 */}
                <div>
                  <Label>갤러리 이미지</Label>
                  <MultiImageBox
                    register={{
                      name: 'images',
                      onBlur: () => {},
                      ref: () => {},
                    }}
                    previews={multiImagePreview as any}
                    handleMultiImageChange={handleMultiImageChange}
                    removeMultiImage={removeMultiImage}
                    error={galleryError}
                    onRetryUpload={async (idx) => {
                      await retryAtWithProgress(idx);
                    }}
                  />
                </div>
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
