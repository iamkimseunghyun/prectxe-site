'use client';

import { Loader2, TestTube2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { stripHtml } from '@/lib/utils';
import { sendTestEmail } from '../../server/actions';

const LAST_ADDRESS_KEY = 'prectxe:email-test-address';

/**
 * 보낼 내용이 있는지. 태그를 모두 걷어낸 텍스트만 보면 포스터 이미지나
 * YouTube(썸네일 이미지로 변환됨)만 있는 메일이 빈 본문으로 판정된다.
 */
function hasContent(html: string): boolean {
  return stripHtml(html) !== '' || /<(img|iframe|video)\b/i.test(html);
}

function readLastAddress(): string {
  try {
    return sessionStorage.getItem(LAST_ADDRESS_KEY) ?? '';
  } catch {
    // 시크릿 모드·저장소 차단 — 직접 입력하면 된다
    return '';
  }
}

function writeLastAddress(value: string): void {
  try {
    sessionStorage.setItem(LAST_ADDRESS_KEY, value);
  } catch {
    // no-op
  }
}

interface TestSendButtonProps {
  /** 테스트 발송에 쓸 현재 제목·본문 */
  getTestPayload: () => { subject: string; body: string };
  /** 발송 중이거나 다른 작업 중이면 잠근다 */
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
}

/**
 * 테스트 발송 버튼 — 받을 주소를 직접 입력한다.
 *
 * 예전에는 "내게 발송"이라 로그인 계정의 주소로 고정돼, 계정 주소와 실제로
 * 확인하려는 받은편지함이 다르면 테스트를 볼 수 없었다. 마지막에 쓴 주소는
 * 이 탭에서만 기억해 매번 다시 치지 않게 한다. localStorage가 아닌 이유:
 * 로그아웃해도 남아, 같은 브라우저를 쓰는 다음 어드민에게 이전 주소가 보인다.
 */
export function TestSendButton({
  getTestPayload,
  disabled,
  onPendingChange,
}: TestSendButtonProps) {
  const { toast } = useToast();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    // 저장된 주소는 열 때 읽는다. 렌더 중에 읽으면 hydration이 어긋난다.
    if (next && !address) setAddress(readLastAddress());
    setOpen(next);
  };

  const handleSend = async () => {
    const to = address.trim();
    if (!to) {
      toast({
        title: '받을 이메일 주소를 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    const { subject, body } = getTestPayload();
    if (!subject.trim() || !hasContent(body)) {
      toast({
        title: '제목과 내용을 먼저 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    onPendingChange?.(true);
    try {
      const result = await sendTestEmail({ subject, body, to });
      if (!result.success) {
        toast({
          title: '테스트 발송 실패',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      writeLastAddress(to);
      setOpen(false);
      toast({
        title: '테스트 발송 완료',
        description: `${result.data.to} 로 보냈습니다.`,
      });
    } catch {
      toast({
        title: '테스트 발송 실패',
        description: '네트워크 상태를 확인하고 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
      onPendingChange?.(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isTesting}
          className="sm:w-48"
        >
          {isTesting ? (
            <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
          ) : (
            <TestTube2 className="mr-2 h-4 w-4" />
          )}
          테스트 발송
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <div className="space-y-2">
          <Label htmlFor={inputId}>테스트를 받을 이메일</Label>
          <Input
            id={inputId}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            // 포털 안이라 폼 제출은 일어나지 않지만, Enter로 보낼 수 있게 한다
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (!isTesting) void handleSend();
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            입력한 주소 한 곳에만 보냅니다. 제목에 [테스트]가 붙습니다.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={handleSend}
          disabled={isTesting}
        >
          {isTesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
              보내는 중...
            </>
          ) : (
            '테스트 보내기'
          )}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
