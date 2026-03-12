'use client';

import { Edit2, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  deleteTicketTier,
  updateTicketTierStatus,
} from '@/modules/tickets/server/actions';
import { TicketTierForm } from './ticket-tier-form';

type Tier = {
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
};

interface TicketTierListProps {
  tiers: Tier[];
  onRefresh: () => void;
}

const STATUS_LABELS: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  scheduled: { label: '판매 예정', variant: 'secondary' },
  on_sale: { label: '판매 중', variant: 'default' },
  sold_out: { label: '매진', variant: 'destructive' },
  closed: { label: '판매 종료', variant: 'outline' },
};

export function TicketTierList({
  tiers,
  onRefresh,
}: TicketTierListProps) {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editTier, setEditTier] = useState<Tier | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Tier | null>(null);

  function handleAdd() {
    setEditTier(undefined);
    setFormOpen(true);
  }

  function handleEdit(tier: Tier) {
    setEditTier(tier);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteTicketTier(deleteTarget.id);
    if (result.success) {
      toast({ title: '등급이 삭제되었습니다.' });
      onRefresh();
    } else {
      toast({ title: result.error, variant: 'destructive' });
    }
    setDeleteTarget(null);
  }

  async function handleStatusChange(
    tierId: string,
    status: 'scheduled' | 'on_sale' | 'sold_out' | 'closed'
  ) {
    const result = await updateTicketTierStatus(tierId, status);
    if (result.success) {
      toast({ title: '상태가 변경되었습니다.' });
      onRefresh();
    } else {
      toast({ title: result.error, variant: 'destructive' });
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            티켓 등급 ({tiers.length})
          </h3>
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <Plus className="mr-1 h-4 w-4" />
            등급 추가
          </Button>
        </div>

        {tiers.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              아직 등록된 티켓 등급이 없습니다.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={handleAdd}
            >
              <Plus className="mr-1 h-4 w-4" />첫 등급 추가하기
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {tiers.map((tier) => {
              const remaining = tier.quantity - tier.soldCount;
              const soldPercent =
                tier.quantity > 0
                  ? Math.round((tier.soldCount / tier.quantity) * 100)
                  : 0;
              const statusInfo =
                STATUS_LABELS[tier.status] ?? STATUS_LABELS.scheduled;

              return (
                <div
                  key={tier.id}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{tier.name}</p>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    {tier.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {tier.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {tier.price.toLocaleString()}원
                      </span>
                      <span>
                        {tier.soldCount}/{tier.quantity}매 ({soldPercent}%)
                      </span>
                      <span>잔여 {remaining}매</span>
                      <span>인당 {tier.maxPerOrder}매</span>
                    </div>
                    {/* 판매율 바 */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${soldPercent}%` }}
                      />
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(tier)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        수정
                      </DropdownMenuItem>
                      {tier.status !== 'on_sale' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(tier.id, 'on_sale')}
                        >
                          판매 시작
                        </DropdownMenuItem>
                      )}
                      {tier.status === 'on_sale' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(tier.id, 'closed')}
                        >
                          판매 종료
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteTarget(tier)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TicketTierForm
        tier={editTier}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={onRefresh}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>등급 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; 등급을 삭제하시겠습니까? 이미
              판매된 티켓이 있으면 삭제할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
