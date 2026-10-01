'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { subscribeNewsletter } from '@/modules/email/server/actions';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: '올바른 이메일 주소를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const result = await subscribeNewsletter(email);
    setIsSubmitting(false);

    if (!result.success) {
      toast({ title: result.error, variant: 'destructive' });
      return;
    }

    // 이미 구독 중인지 여부는 응답으로 구분하지 않는다 —
    // 구분해서 보여주면 외부에서 구독자 주소를 조회할 수 있는 열거 오라클이 된다.
    toast({
      title: '구독이 완료되었습니다.',
      description: '다음 Drop과 Journal을 이 주소로 보내드릴게요.',
    });
    setEmail('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-stretch gap-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="min-w-0 flex-1 border-b border-neutral-300 bg-transparent pb-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden"
        aria-label="이메일 주소"
        required
      />
      <button
        type="submit"
        disabled={isSubmitting}
        aria-label="뉴스레터 구독"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-900 text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
        ) : (
          <ArrowRight className="h-3.5 w-3.5" />
        )}
      </button>
    </form>
  );
}
