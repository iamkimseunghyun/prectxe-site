'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { undoLoggedEntry } from '@/modules/tickets/server/actions';

/**
 * 입장 기록 화면의 '취소' — 주최자가 고른 입장 하나를 되돌린다. 다른 기기에서
 * 실수로 들여보낸 입장을 바로잡는 용도라, 누가·어느 입구에서 처리했는지 보이는
 * 이 표에서만 연다(스캐너에서는 자기 입장만 취소할 수 있다).
 */
export function UndoEntryButton({
  dropId,
  entryClientId,
  buyerName,
  gate,
}: {
  dropId: string;
  entryClientId: string;
  buyerName: string;
  gate: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const r = await undoLoggedEntry(dropId, entryClientId);
      setOpen(false);
      if (!r.success) {
        toast({ title: r.error, variant: 'destructive' });
        return;
      }
      toast({
        title: r.reverted
          ? `${buyerName} 입장을 취소했습니다.`
          : '취소 기록을 남겼지만 입장 상태는 그대로입니다. 그 사이 입장 상태가 바뀌었습니다.',
      });
      router.refresh();
    });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        취소
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`${buyerName} 입장을 취소할까요?`}
        description={`${gate ? `${gate} 입구에서 ` : ''}처리한 이 입장을 되돌려 미입장으로 바꿉니다. 실수로 들여보낸 경우에만 취소하세요. 기록은 지워지지 않고 취소 기록이 남습니다.`}
        confirmText="입장 취소"
        variant="destructive"
        disabled={pending}
        onConfirm={confirm}
      />
    </>
  );
}
