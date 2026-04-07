import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { listPnLSheets, listPnLTemplates } from '@/modules/pnl/server/actions';
import { PnLDashboardView } from '@/modules/pnl/ui/views/pnl-dashboard-view';

export default async function PnLAdminPage() {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const [sheetsRes, templatesRes] = await Promise.all([
    listPnLSheets(),
    listPnLTemplates(),
  ]);

  const sheets = sheetsRes.success ? sheetsRes.data : [];
  const templates = templatesRes.success ? templatesRes.data : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PnLDashboardView sheets={sheets} templates={templates} />
    </div>
  );
}
