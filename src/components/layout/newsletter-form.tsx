'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

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
    // TODO: 구독자 DB·확인 메일 발송 server action 연결
    await new Promise((r) => setTimeout(r, 300));
    toast({
      title: '곧 뉴스레터가 시작됩니다.',
      description: '미리 알림을 받으시려면 info@laaf.kr로 연락주세요.',
    });
    setEmail('');
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-stretch gap-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="min-w-0 flex-1 border-b border-neutral-300 bg-transparent pb-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
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
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ArrowRight className="h-3.5 w-3.5" />
        )}
      </button>
    </form>
  );
}
