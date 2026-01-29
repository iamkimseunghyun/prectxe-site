import { redirect } from 'next/navigation';
import { SMSDashboard } from '@/modules/sms/ui/views/sms-dashboard';
import getSession from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export default async function SMSPage() {
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
        <h2 className="text-2xl font-bold tracking-tight">SMS 단체 발송</h2>
        <p className="text-muted-foreground">
          Form 응답자 또는 직접 입력한 번호로 단체 문자를 발송하세요
        </p>
      </div>

      <SMSDashboard userId={session.id} isAdmin={session.isAdmin || false} />
    </div>
  );
}
