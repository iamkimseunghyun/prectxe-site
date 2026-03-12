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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { TicketTierInput } from '@/lib/schemas/ticket';
import {
  createTicketTier,
  updateTicketTier,
} from '@/modules/tickets/server/actions';

interface TicketTierFormProps {
  programId: string;
  tier?: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    quantity: number;
    maxPerOrder: number;
    saleStart: Date | null;
    saleEnd: Date | null;
    order: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TicketTierForm({
  programId,
  tier,
  open,
  onOpenChange,
  onSuccess,
}: TicketTierFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!tier;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const data: TicketTierInput = {
      name: fd.get('name') as string,
      description: (fd.get('description') as string) || undefined,
      price: Number(fd.get('price')),
      quantity: Number(fd.get('quantity')),
      maxPerOrder: Number(fd.get('maxPerOrder')) || 4,
      saleStart: (fd.get('saleStart') as string) || undefined,
      saleEnd: (fd.get('saleEnd') as string) || undefined,
      order: Number(fd.get('order')) || 0,
    };

    const result = isEdit
      ? await updateTicketTier(tier.id, data)
      : await createTicketTier(programId, data);

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: isEdit ? '등급이 수정되었습니다.' : '등급이 추가되었습니다.',
      });
      onOpenChange(false);
      onSuccess();
    } else {
      toast({ title: result.error, variant: 'destructive' });
    }
  }

  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? '티켓 등급 수정' : '티켓 등급 추가'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">
              등급 이름 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="예: 얼리버드, 일반, VIP"
              defaultValue={tier?.name ?? ''}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="등급에 대한 간단한 설명"
              defaultValue={tier?.description ?? ''}
              rows={2}
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
                step={1000}
                defaultValue={tier?.price ?? 0}
                required
              />
            </div>
            <div>
              <Label htmlFor="quantity">
                수량 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min={1}
                defaultValue={tier?.quantity ?? 100}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="maxPerOrder">인당 구매 제한</Label>
            <Input
              id="maxPerOrder"
              name="maxPerOrder"
              type="number"
              min={1}
              max={20}
              defaultValue={tier?.maxPerOrder ?? 4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="saleStart">판매 시작</Label>
              <Input
                id="saleStart"
                name="saleStart"
                type="datetime-local"
                defaultValue={formatDateForInput(tier?.saleStart ?? null)}
              />
            </div>
            <div>
              <Label htmlFor="saleEnd">판매 종료</Label>
              <Input
                id="saleEnd"
                name="saleEnd"
                type="datetime-local"
                defaultValue={formatDateForInput(tier?.saleEnd ?? null)}
              />
            </div>
          </div>

          <input type="hidden" name="order" value={tier?.order ?? 0} />

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
