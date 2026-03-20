'use client';

import {
  ArrowLeft,
  Banknote,
  BarChart3,
  ExternalLink,
  Loader2,
  Package,
  Pencil,
  ShoppingCart,
  Ticket,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
  deleteDrop,
  getDrop,
  getDropStats,
  updateDrop,
} from '@/modules/drops/server/actions';
import { GoodsVariantList } from '@/modules/drops/ui/components/goods-variant-list';
import { TicketTierList } from '@/modules/tickets/ui/components/ticket-tier-list';

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
  ticketTiers: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    quantity: number;
    soldCount: number;
    maxPerOrder: number;
    saleStart: Date | null;
    saleEnd: Date | null;
    status: string;
    order: number;
  }[];
  variants: {
    id: string;
    name: string;
    price: number;
    stock: number;
    soldCount: number;
    options: unknown;
    order: number;
  }[];
};

type Stats = {
  totalRevenue: number;
  totalSold: number;
  totalCapacity: number;
  salesRate: number;
  orderCount: number;
};

const STATUS_LABELS: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  draft: { label: '초안', variant: 'secondary' },
  upcoming: { label: '예정', variant: 'outline' },
  on_sale: { label: '판매 중', variant: 'default' },
  sold_out: { label: '매진', variant: 'destructive' },
  closed: { label: '종료', variant: 'outline' },
};

export function DropDetailView({ dropId }: { dropId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [drop, setDrop] = useState<DropData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusValue, setStatusValue] = useState(drop?.status ?? 'draft');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [dropData, statsData] = await Promise.all([
      getDrop(dropId),
      getDropStats(dropId),
    ]);
    setDrop(dropData as DropData | null);
    if (dropData) setStatusValue(dropData.status);
    setStats(statsData);
    setLoading(false);
  }, [dropId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!drop) return;
    setIsSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const result = await updateDrop(drop.id, {
      title: fd.get('title') as string,
      slug: fd.get('slug') as string,
      summary: (fd.get('summary') as string) || undefined,
      description: (fd.get('description') as string) || undefined,
      heroUrl: (fd.get('heroUrl') as string) || undefined,
      videoUrl: (fd.get('videoUrl') as string) || undefined,
      status: fd.get('status') as string,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast({ title: '저장되었습니다.' });
      loadData();
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
    const result = await updateDrop(drop.id, {
      status: 'on_sale',
      publishedAt: new Date().toISOString(),
    });
    if (result.success) {
      toast({ title: '공개되었습니다.' });
      loadData();
    } else {
      toast({ title: result.error, variant: 'destructive' });
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">로딩 중...</div>
    );
  }

  if (!drop) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Drop을 찾을 수 없습니다.
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[drop.status] ?? STATUS_LABELS.draft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/drops">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{drop.title}</h1>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <Badge variant="outline">
                {drop.type === 'ticket' ? '티켓' : '굿즈'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">/{drop.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/drops/${drop.id}/edit`}>
              <Pencil className="mr-1 h-4 w-4" />
              수정
            </Link>
          </Button>
          {drop.status !== 'draft' && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/drops/${drop.slug}`} target="_blank">
                <ExternalLink className="mr-1 h-4 w-4" />
                보기
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/drops/${drop.id}/orders`}>
              <ShoppingCart className="mr-1 h-4 w-4" />
              주문 목록
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-50 p-2">
                <Banknote className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">매출</p>
                <p className="text-lg font-semibold">
                  {stats.totalRevenue.toLocaleString()}원
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-green-50 p-2">
                <Ticket className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">판매</p>
                <p className="text-lg font-semibold">
                  {stats.totalSold}/{stats.totalCapacity}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-purple-50 p-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">판매율</p>
                <p className="text-lg font-semibold">{stats.salesRate}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-orange-50 p-2">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">주문</p>
                <p className="text-lg font-semibold">{stats.orderCount}건</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          <form id="drop-form" onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="title">제목</Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={drop.title}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      name="slug"
                      defaultValue={drop.slug}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="summary">요약</Label>
                  <Input
                    id="summary"
                    name="summary"
                    defaultValue={drop.summary ?? ''}
                  />
                </div>
                <div>
                  <Label htmlFor="description">상세 설명</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={drop.description ?? ''}
                    rows={4}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="heroUrl">히어로 이미지 URL</Label>
                    <Input
                      id="heroUrl"
                      name="heroUrl"
                      type="url"
                      defaultValue={drop.heroUrl ?? ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="videoUrl">영상 URL</Label>
                    <Input
                      id="videoUrl"
                      name="videoUrl"
                      type="url"
                      defaultValue={drop.videoUrl ?? ''}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Ticket Tiers or Goods Variants — form 밖에 배치 */}
          {drop.type === 'ticket' && (
            <Card>
              <CardContent className="p-6">
                <TicketTierList
                  dropId={drop.id}
                  tiers={drop.ticketTiers}
                  onRefresh={loadData}
                />
              </CardContent>
            </Card>
          )}

          {drop.type === 'goods' && (
            <Card>
              <CardContent className="p-6">
                <GoodsVariantList
                  dropId={drop.id}
                  variants={drop.variants}
                  onRefresh={loadData}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>상태</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="hidden"
                name="status"
                value={statusValue}
                form="drop-form"
              />
              <Select value={statusValue} onValueChange={setStatusValue}>
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

              {drop.status === 'draft' && (
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
                form="drop-form"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                저장
              </Button>

              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
