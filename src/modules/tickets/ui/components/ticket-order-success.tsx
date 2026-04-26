'use client';

import { CheckCircle2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function formatExpiry(expiresAt: Date | string): string {
  const date = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

export function FreeOrderSuccess({
  orderNo,
  buyerEmail,
}: {
  orderNo: string;
  buyerEmail: string;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
        Tickets
      </h2>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <p className="mt-4 text-xl font-semibold text-emerald-900">
          신청이 완료되었습니다
        </p>
        <p className="mt-2 font-mono text-sm text-emerald-700">{orderNo}</p>
        <p className="mt-3 text-sm text-emerald-600">
          확인 이메일이 {buyerEmail}로 발송됩니다.
        </p>
      </div>
    </div>
  );
}

interface BankTransferOrderSuccessProps {
  orderNo: string;
  totalAmount: number;
  depositorName: string;
  expiresAt: Date | string;
  bankInfo: { bankName: string; accountNumber: string; accountHolder: string };
  buyerEmail: string;
}

export function BankTransferOrderSuccess({
  orderNo,
  totalAmount,
  depositorName,
  expiresAt,
  bankInfo,
  buyerEmail,
}: BankTransferOrderSuccessProps) {
  const { toast } = useToast();

  function copyToClipboard(value: string, label: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(value).then(
      () => toast({ title: `${label} 복사됨` }),
      () => toast({ title: '복사 실패', variant: 'destructive' })
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
        Tickets
      </h2>
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            주문 접수 완료 · 입금 대기
          </p>
          <p className="mt-2 font-mono text-sm text-amber-900">{orderNo}</p>
          <p className="mt-3 text-sm leading-relaxed text-amber-800">
            아래 계좌로 <strong>{totalAmount.toLocaleString()}원</strong> 입금해
            주세요. 입금 확인 후 주문이 확정되며 이메일로 안내드립니다.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            입금 계좌
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">은행</dt>
              <dd className="font-medium text-neutral-900">
                {bankInfo.bankName}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-neutral-500">계좌번호</dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-base font-semibold text-neutral-900">
                  {bankInfo.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(bankInfo.accountNumber, '계좌번호')
                  }
                  className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                  aria-label="계좌번호 복사"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">예금주</dt>
              <dd className="font-medium text-neutral-900">
                {bankInfo.accountHolder}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            입금자명 (반드시 일치)
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="font-mono text-2xl font-bold text-amber-900">
              {depositorName}
            </p>
            <button
              type="button"
              onClick={() => copyToClipboard(depositorName, '입금자명')}
              className="rounded-md p-2 text-amber-700 transition-colors hover:bg-amber-100"
              aria-label="입금자명 복사"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-amber-700">
            동명이인 매칭을 위해 위 형태(이름+주문번호 끝 4자리) 그대로 입금해
            주세요.
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            입금 마감: {formatExpiry(expiresAt)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-red-600">
            마감 시각까지 미입금 시 주문은 자동 취소되며 좌석이 다른 고객에게
            풀립니다.
          </p>
        </div>

        <p className="text-center text-xs text-neutral-400">
          안내 이메일이 {buyerEmail}로 발송됩니다.
        </p>
      </div>
    </div>
  );
}
