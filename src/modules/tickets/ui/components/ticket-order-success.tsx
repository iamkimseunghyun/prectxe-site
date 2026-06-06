'use client';

import { CheckCircle2, Copy } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import type { Locale } from '@/i18n/config';
import { getSalesTerms } from '@/lib/constants/sales-terms';

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
  const t = useTranslations('success');
  return (
    <div className="space-y-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
        Tickets
      </h2>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <p className="mt-4 text-xl font-semibold text-emerald-900">
          {t('applicationComplete')}
        </p>
        <p className="mt-2 font-mono text-sm text-emerald-700">{orderNo}</p>
        <p className="mt-3 text-sm text-emerald-600">
          {t('confirmEmailSent', { email: buyerEmail })}
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
  const t = useTranslations('success');
  const tRoot = useTranslations();
  const locale = useLocale() as Locale;
  const ST = getSalesTerms(locale);
  const fmtPrice = (n: number) =>
    locale === 'en' ? `₩${n.toLocaleString()}` : `${n.toLocaleString()}원`;

  function copyToClipboard(value: string, label: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(value).then(
      () => toast({ title: t('copied', { label }) }),
      () => toast({ title: t('copyFailed'), variant: 'destructive' })
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
            {ST.receiptHeading} · {t('awaitingDeposit')}
          </p>
          <p className="mt-2 font-mono text-sm text-amber-900">{orderNo}</p>
          <p className="mt-3 text-sm leading-relaxed text-amber-800">
            {t.rich('depositInstruction', {
              amount: fmtPrice(totalAmount),
              strong: (chunks) => <strong>{chunks}</strong>,
            })}{' '}
            {ST.confirmedAfterDeposit}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {t('depositAccount')}
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">{t('bank')}</dt>
              <dd className="font-medium text-neutral-900">
                {bankInfo.bankName}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-neutral-500">{t('accountNumber')}</dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-base font-semibold text-neutral-900">
                  {bankInfo.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(bankInfo.accountNumber, t('accountNumber'))
                  }
                  className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                  aria-label={t('copyAria', { label: t('accountNumber') })}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">{t('accountHolder')}</dt>
              <dd className="font-medium text-neutral-900">
                {bankInfo.accountHolder}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            {t('depositorNameMustMatch')}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="font-mono text-2xl font-bold text-amber-900">
              {depositorName}
            </p>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(depositorName, tRoot('checkout.depositorName'))
              }
              className="rounded-md p-2 text-amber-700 transition-colors hover:bg-amber-100"
              aria-label={t('copyAria', {
                label: tRoot('checkout.depositorName'),
              })}
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-amber-700">
            {ST.depositorTip}
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            {t('depositDeadline', { time: formatExpiry(expiresAt) })}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-red-600">
            {ST.autoCancelNotice}
          </p>
        </div>

        <p className="text-center text-xs text-neutral-400">
          {t('noticeEmailSent', { email: buyerEmail })}
        </p>
      </div>
    </div>
  );
}
