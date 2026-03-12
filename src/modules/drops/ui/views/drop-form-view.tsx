'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
  createDrop,
  deleteDrop,
  updateDrop,
} from '@/modules/drops/server/actions';

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const data = {
      title: fd.get('title') as string,
      slug: fd.get('slug') as string,
      type: fd.get('type') as 'ticket' | 'goods',
      summary: (fd.get('summary') as string) || undefined,
      description: (fd.get('description') as string) || undefined,
      heroUrl: (fd.get('heroUrl') as string) || undefined,
      videoUrl: (fd.get('videoUrl') as string) || undefined,
      status: fd.get('status') as string,
    };

    const result = isEdit
      ? await updateDrop(drop.id, data)
      : await createDrop(data);

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: isEdit ? 'Drop이 수정되었습니다.' : 'Drop이 생성되었습니다.',
      });
      if (!isEdit && result.data) {
        router.push(`/admin/drops/${result.data.id}`);
      }
    } else {
      toast({ title: result.error, variant: 'destructive' });
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
                  <Select
                    name="type"
                    defaultValue={drop?.type ?? 'ticket'}
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

            <Card>
              <CardHeader>
                <CardTitle>미디어</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="heroUrl">히어로 이미지 URL</Label>
                  <Input
                    id="heroUrl"
                    name="heroUrl"
                    type="url"
                    defaultValue={drop?.heroUrl ?? ''}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="videoUrl">영상 URL</Label>
                  <Input
                    id="videoUrl"
                    name="videoUrl"
                    type="url"
                    defaultValue={drop?.videoUrl ?? ''}
                    placeholder="https://..."
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
                <Select name="status" defaultValue={drop?.status ?? 'draft'}>
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
