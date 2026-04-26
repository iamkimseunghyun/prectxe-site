import { Ticket } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import getSession from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export const metadata: Metadata = {
  title: '입장권 스캔',
  robots: { index: false, follow: false },
};

export default async function ScanFallbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const session = await getSession();
  let isAdmin = false;
  if (session.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true },
    });
    isAdmin = user?.role === 'ADMIN';
  }

  // 어드민이라면 어떤 drop의 티켓인지 찾아서 스캐너로 안내
  let scannerHref: string | null = null;
  if (isAdmin) {
    const ticket = await prisma.ticket.findUnique({
      where: { token },
      select: { ticketTier: { select: { dropId: true } } },
    });
    if (ticket?.ticketTier?.dropId) {
      scannerHref = `/admin/drops/${ticket.ticketTier.dropId}/scanner`;
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-6 text-white">
      <div className="w-full max-w-sm space-y-5 text-center">
        <Ticket className="mx-auto h-12 w-12 text-white/40" />
        <p className="text-xl font-semibold">PRECTXE 입장권</p>
        <p className="text-sm leading-relaxed text-white/60">
          이 QR 코드는 공연 입장구에서 운영자가 처리합니다. 본인의 입장권은
          이메일에서 받은 마이페이지에서 확인하실 수 있습니다.
        </p>
        <p className="font-mono text-[10px] tracking-wider text-white/30">
          {token}
        </p>

        {isAdmin && scannerHref && (
          <div className="space-y-3 border-t border-white/10 pt-5">
            <p className="text-xs uppercase tracking-wider text-white/40">
              운영자
            </p>
            <Link
              href={scannerHref}
              className="block rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90"
            >
              스캐너 페이지 열기 →
            </Link>
            <p className="text-[11px] leading-relaxed text-white/40">
              연속 스캔은 스캐너 페이지에서 더 효율적입니다.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
