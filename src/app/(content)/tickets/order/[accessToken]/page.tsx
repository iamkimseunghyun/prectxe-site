import { CheckCircle2, XCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import QRCode from 'qrcode';
import ReactMarkdown from 'react-markdown';
import type { Locale } from '@/i18n/config';
import { getSalesTerms } from '@/lib/constants/sales-terms';
import { prisma } from '@/lib/db/prisma';
import { formatKstDateTime, formatKstEventRange } from '@/lib/utils';
import { getTicketScanUrl } from '@/lib/utils/ticket-token';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ticketPage');
  return {
    title: t('title'),
    robots: { index: false, follow: false },
  };
}

async function generateQrSvg(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

function formatEventDate(date: Date | null, endDate: Date | null): string {
  if (!date) return '';
  return formatKstEventRange(
    new Date(date),
    endDate ? new Date(endDate) : null
  );
}

export default async function OrderTicketsPage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;
  const t = await getTranslations('ticketPage');
  const locale = (await getLocale()) as Locale;
  const ST = getSalesTerms(locale);

  const order = await prisma.order.findUnique({
    where: { accessToken },
    include: {
      drop: true,
      tickets: {
        include: { ticketTier: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!order || order.status !== 'paid') notFound();

  const tickets = order.tickets;
  const totalCount = tickets.length;
  const checkedInCount = tickets.filter(
    (t) => t.status === 'checked_in'
  ).length;

  // QR SVG들 미리 생성 (RSC, 동시)
  const qrSvgs = await Promise.all(
    tickets.map((t) => generateQrSvg(getTicketScanUrl(t.token)))
  );

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-md px-5 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
            PRECTXE Tickets
          </p>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
            {order.drop?.title ?? t('title')}
          </h1>
          {order.drop?.eventDate && (
            <p className="text-sm text-white/60">
              {formatEventDate(order.drop.eventDate, order.drop.eventEndDate)}
            </p>
          )}
          {order.drop?.venue && (
            <p className="text-sm text-white/60">
              {order.drop.venue}
              {order.drop.venueAddress && ` · ${order.drop.venueAddress}`}
            </p>
          )}
          <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/50">
            <span>
              {ST.orderNumber} · {order.orderNo}
            </span>
            <span>
              {t('admittedCount', {
                checked: checkedInCount,
                total: totalCount,
              })}
            </span>
          </div>
        </header>

        {tickets.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            {t('noTickets')}
          </div>
        ) : (
          <ul className="space-y-5">
            {tickets.map((ticket, idx) => {
              const isCheckedIn = ticket.status === 'checked_in';
              const isCancelled = ticket.status === 'cancelled';
              return (
                <li
                  key={ticket.id}
                  className={`overflow-hidden rounded-2xl border ${
                    isCancelled
                      ? 'border-red-500/30 bg-red-950/20 opacity-60'
                      : isCheckedIn
                        ? 'border-emerald-400/30 bg-emerald-950/20'
                        : 'border-white/15 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-xs">
                    <span className="font-semibold uppercase tracking-wider text-white/50">
                      Ticket {idx + 1} / {totalCount}
                    </span>
                    {isCancelled ? (
                      <span className="inline-flex items-center gap-1 text-red-400">
                        <XCircle className="h-3.5 w-3.5" />
                        {t('cancelled')}
                      </span>
                    ) : isCheckedIn ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('admitted')}
                      </span>
                    ) : (
                      <span className="text-white/50">{t('waiting')}</span>
                    )}
                  </div>

                  <div className="px-5 py-6">
                    <p className="text-base font-semibold text-white">
                      {ticket.ticketTier?.name ?? t('tierFallback')}
                    </p>
                    {ticket.ticketTier?.description && (
                      <div className="prose prose-invert prose-sm mt-1 max-w-none text-white/60 leading-relaxed prose-p:my-0">
                        <ReactMarkdown>
                          {ticket.ticketTier.description}
                        </ReactMarkdown>
                      </div>
                    )}

                    <div
                      className={`mx-auto mt-5 aspect-square max-w-[280px] overflow-hidden rounded-xl bg-white p-3 [&>svg]:h-full [&>svg]:w-full ${
                        isCancelled || isCheckedIn ? 'grayscale' : ''
                      }`}
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: 서버에서 생성한 신뢰 가능한 SVG
                      dangerouslySetInnerHTML={{ __html: qrSvgs[idx] }}
                    />

                    <p className="mt-4 text-center font-mono text-[10px] tracking-wider text-white/30">
                      {ticket.token}
                    </p>

                    {isCheckedIn && ticket.checkedInAt && (
                      <p className="mt-2 text-center text-xs text-emerald-300/70">
                        {t('admittedAt', {
                          time: formatKstDateTime(new Date(ticket.checkedInAt)),
                        })}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {order.drop?.notice && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              {t('notice')}
            </p>
            <div className="space-y-2 text-sm leading-relaxed text-white/70">
              {order.drop.notice.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 space-y-2 text-center text-xs text-white/30">
          <p>{t('footerShowQr')}</p>
          <p>{t('footerShare')}</p>
        </footer>
      </div>
    </main>
  );
}
