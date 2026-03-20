'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { GoodsVariantInput } from '@/lib/schemas/ticket';
import {
  createGoodsVariant,
  updateGoodsVariant,
} from '@/modules/tickets/server/actions';

interface GoodsVariantFormProps {
  dropId: string;
  variant?: {
    id: string;
    name: string;
    price: number;
    stock: number;
    soldCount: number;
    options: unknown;
    order: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function GoodsVariantForm({
  dropId,
  variant,
  open,
  onOpenChange,
  onSuccess,
}: GoodsVariantFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!variant;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const data: GoodsVariantInput = {
      name: fd.get('name') as string,
      price: Number(fd.get('price')),
      stock: Number(fd.get('stock')),
      options: (fd.get('options') as string) || undefined,
      order: Number(fd.get('order')) || 0,
    };

    const result = isEdit
      ? await updateGoodsVariant(variant.id, data)
      : await createGoodsVariant(dropId, data);

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: isEdit ? '옵션이 수정되었습니다.' : '옵션이 추가되었습니다.',
      });
      onOpenChange(false);
      onSuccess();
    } else {
      toast({ title: result.error, variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? '굿즈 옵션 수정' : '굿즈 옵션 추가'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">
              옵션 이름 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="예: A2 포스터, L사이즈, 블랙"
              defaultValue={variant?.name ?? ''}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">
                가격 (원) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step={100}
                defaultValue={variant?.price ?? 0}
                required
              />
            </div>
            <div>
              <Label htmlFor="stock">
                재고 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min={0}
                defaultValue={variant?.stock ?? 0}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="options">추가 옵션 (JSON)</Label>
            <Input
              id="options"
              name="options"
              placeholder='예: {"size": "A2", "color": "black"}'
              defaultValue={
                variant?.options ? JSON.stringify(variant.options) : ''
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              선택사항. 사이즈, 색상 등 추가 정보를 JSON으로 입력합니다.
            </p>
          </div>

          <input type="hidden" name="order" value={variant?.order ?? 0} />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : isEdit ? '수정' : '추가'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
