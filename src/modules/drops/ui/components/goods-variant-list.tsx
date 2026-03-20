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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { deleteGoodsVariant } from '@/modules/tickets/server/actions';
import { GoodsVariantForm } from './goods-variant-form';

type Variant = {
  id: string;
  name: string;
  price: number;
  stock: number;
  soldCount: number;
  options: unknown;
  order: number;
};

interface GoodsVariantListProps {
  dropId: string;
  variants: Variant[];
  onRefresh: () => void;
}

export function GoodsVariantList({
  dropId,
  variants,
  onRefresh,
}: GoodsVariantListProps) {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editVariant, setEditVariant] = useState<Variant | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Variant | null>(null);

  function handleAdd() {
    setEditVariant(undefined);
    setFormOpen(true);
  }

  function handleEdit(variant: Variant) {
    setEditVariant(variant);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteGoodsVariant(deleteTarget.id);
    if (result.success) {
      toast({ title: '옵션이 삭제되었습니다.' });
      onRefresh();
    } else {
      toast({ title: result.error, variant: 'destructive' });
    }
    setDeleteTarget(null);
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            굿즈 옵션 ({variants.length})
          </h3>
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <Plus className="mr-1 h-4 w-4" />
            옵션 추가
          </Button>
        </div>

        {variants.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              아직 등록된 굿즈 옵션이 없습니다.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={handleAdd}
            >
              <Plus className="mr-1 h-4 w-4" />첫 옵션 추가하기
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {variants.map((v) => {
              const remaining = v.stock - v.soldCount;
              const soldPercent =
                v.stock > 0 ? Math.round((v.soldCount / v.stock) * 100) : 0;

              return (
                <div
                  key={v.id}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{v.name}</p>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {v.price.toLocaleString()}원
                      </span>
                      <span>
                        판매 {v.soldCount}/{v.stock}개 ({soldPercent}%)
                      </span>
                      <span>잔여 {remaining}개</span>
                    </div>
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
                      <DropdownMenuItem onClick={() => handleEdit(v)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteTarget(v)}
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

      <GoodsVariantForm
        dropId={dropId}
        variant={editVariant}
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
            <AlertDialogTitle>옵션 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; 옵션을 삭제하시겠습니까? 이미
              판매된 상품이 있으면 삭제할 수 없습니다.
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
