import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import {
  buildDefaultRows,
  DEFAULT_SCENARIOS,
} from '@/lib/pnl/default-template';
import { PnLTemplateEditView } from '@/modules/pnl/ui/views/pnl-template-edit-view';

export default async function PnLTemplateNewPage() {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PnLTemplateEditView
        template={{
          id: null,
          name: '',
          description: null,
          scenarios: DEFAULT_SCENARIOS,
          rows: buildDefaultRows(),
        }}
      />
    </div>
  );
}
