import { notFound, redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import type { PnLRow } from '@/lib/schemas/pnl';
import { getPnLTemplate } from '@/modules/pnl/server/actions';
import { PnLTemplateEditView } from '@/modules/pnl/ui/views/pnl-template-edit-view';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PnLTemplateEditPage({ params }: Props) {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const { id } = await params;
  const res = await getPnLTemplate(id);
  if (!res.success || !res.data) notFound();

  const tpl = res.data;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PnLTemplateEditView
        template={{
          id: tpl.id,
          name: tpl.name,
          description: tpl.description,
          scenarios: tpl.scenarios as string[],
          rows: tpl.rows as unknown as PnLRow[],
        }}
      />
    </div>
  );
}
