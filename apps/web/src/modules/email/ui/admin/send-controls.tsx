'use client';

import { Loader2, Send, TestTube2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { sendTestEmail } from '../../server/actions';

interface SendControlsProps {
  /** 발송 대상 수. 0이면 발송 버튼이 잠긴다 */
  recipientCount: number;
  isSending: boolean;
  /** 확인 다이얼로그에서 "발송"을 눌렀을 때 */
  onConfirm: () => void;
  /** 폼 검증을 통과했는지 확인하고 통과 시 true. 실패하면 필드 에러가 표시된다 */
  validate: () => Promise<boolean>;
  /** 테스트 발송에 쓸 현재 제목·본문 */
  getTestPayload: () => { subject: string; body: string };
  /** 확인 다이얼로그에 표시할 대상 설명 (예: "폼 응답자 132명") */
  targetLabel: string;
}

/**
 * 발송 버튼 묶음 — 테스트 발송 + 확인 다이얼로그.
 *
 * 발송은 되돌릴 수 없는데 예전에는 브로드캐스트에만 확인 단계가 있었고,
 * 정작 수신자 수가 큰 독립·Form 발송은 버튼 한 번에 나갔다.
 */
export function SendControls({
  recipientCount,
  isSending,
  onConfirm,
  validate,
  getTestPayload,
  targetLabel,
}: SendControlsProps) {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    const { subject, body } = getTestPayload();
    if (!subject.trim() || !body.trim()) {
      toast({
        title: '제목과 내용을 먼저 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    const result = await sendTestEmail({ subject, body });
    setIsTesting(false);

    if (!result.success) {
      toast({
        title: '테스트 발송 실패',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: '테스트 발송 완료',
      description: `${result.data.to} 로 보냈습니다. 실제 발송과 같은 템플릿입니다.`,
    });
  };

  const handleSendClick = async () => {
    if (await validate()) setConfirmOpen(true);
  };

  const disabled = isSending || isTesting;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        type="button"
        variant="outline"
        onClick={handleTest}
        disabled={disabled}
        className="sm:w-48"
      >
        {isTesting ? (
          <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
        ) : (
          <TestTube2 className="mr-2 h-4 w-4" />
        )}
        내게 테스트 발송
      </Button>

      <Button
        type="button"
        onClick={handleSendClick}
        disabled={disabled || recipientCount === 0}
        className="flex-1"
      >
        {isSending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
            발송 중...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            {recipientCount > 0 ? `${recipientCount}명에게 발송` : '발송하기'}
          </>
        )}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>발송 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {targetLabel}에게 즉시 발송됩니다. 이 작업은 취소할 수 없습니다.
              보내기 전에 "내게 테스트 발송"으로 실물을 확인하는 것을 권합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSending}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
            >
              발송
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
