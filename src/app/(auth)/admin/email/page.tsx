import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { EmailDashboard } from '@/modules/email/ui/views/email-dashboard';

export default async function EmailPage() {
  const session = await getSession();
  if (!session.id) redirect('/auth/signin');

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { role: true },
  });

  if (!user || user.role !== 'ADMIN') redirect('/');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">이메일 단체 발송</h2>
        <p className="text-muted-foreground">
          Form 응답자 또는 직접 입력한 이메일로 단체 메일을 발송하세요
        </p>
      </div>

      <EmailDashboard userId={session.id} isAdmin={session.isAdmin || false} />
    </div>
  );
}
