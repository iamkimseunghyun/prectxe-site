'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { unsubscribeNewsletter } from '../../server/actions';

interface UnsubscribeFormProps {
  /** 메일 링크의 서명 토큰 (있으면 주소 입력 없이 해지) */
  token?: string;
  /** 토큰에서 확인된 주소. 토큰이 없거나 깨졌으면 null */
  knownEmail: string | null;
}

export function UnsubscribeForm({ token, knownEmail }: UnsubscribeFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    // 토큰이 유효하면 주소를 클라이언트가 보내지 않는다 — 서버가 토큰에서 꺼낸다.
    const result = await unsubscribeNewsletter(
      knownEmail && token ? { token } : { email: email.trim() }
    );

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mt-6 space-y-2">
        <p className="text-sm text-neutral-900">수신 거부가 완료되었습니다.</p>
        <p className="text-sm text-neutral-500">
          앞으로 뉴스레터를 보내지 않습니다. 주문·입장권 등 거래 안내 메일은
          계속 발송됩니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {knownEmail ? (
        <p className="text-sm text-neutral-600">
          <span className="font-medium text-neutral-900">{knownEmail}</span>{' '}
          주소로 발송되는 뉴스레터를 해지합니다.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-neutral-600">
            {token
              ? '링크가 만료되었거나 올바르지 않습니다. 해지할 이메일 주소를 입력해주세요.'
              : '해지할 이메일 주소를 입력해주세요.'}
          </p>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            aria-label="이메일 주소"
            required
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
            처리 중...
          </>
        ) : (
          '수신 거부'
        )}
      </Button>
    </form>
  );
}
