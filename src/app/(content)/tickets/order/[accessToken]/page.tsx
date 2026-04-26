import { CheckCircle2, XCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db/prisma';
import { getTicketScanUrl } from '@/lib/utils/ticket-token';

export const metadata: Metadata = {
  title: '입장권',
  robots: { index: false, follow: false },
};

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
  const start = new Date(date);
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  };
  let text = start.toLocaleString('ko-KR', opts);
  if (endDate) {
    const end = new Date(endDate);
    text += ` ~ ${end.toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }
  return text;
}

export default async function OrderTicketsPage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;

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
            {order.drop?.title ?? '입장권'}
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
            <span>주문번호 · {order.orderNo}</span>
            <span>
              입장 {checkedInCount} / {totalCount}
            </span>
          </div>
        </header>

        {tickets.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            발급된 입장권이 없습니다.
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
                        취소됨
                      </span>
                    ) : isCheckedIn ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        입장 완료
                      </span>
                    ) : (
                      <span className="text-white/50">입장 대기</span>
                    )}
                  </div>

                  <div className="px-5 py-6">
                    <p className="text-base font-semibold text-white">
                      {ticket.ticketTier?.name ?? '티켓'}
                    </p>
                    {ticket.ticketTier?.description && (
                      <p className="mt-1 text-xs leading-relaxed text-white/60">
                        {ticket.ticketTier.description}
                      </p>
                    )}

                    <div
                      className={`mx-auto mt-5 aspect-square max-w-[280px] rounded-xl bg-white p-3 ${
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
                        {new Date(ticket.checkedInAt).toLocaleString('ko-KR')}에
                        입장
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
              안내사항
            </p>
            <div className="space-y-2 text-sm leading-relaxed text-white/70">
              {order.drop.notice.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 space-y-2 text-center text-xs text-white/30">
          <p>입장 시 위 QR 코드를 운영자에게 보여주세요.</p>
          <p>이 페이지는 일행과 공유 가능합니다.</p>
        </footer>
      </div>
    </main>
  );
}
