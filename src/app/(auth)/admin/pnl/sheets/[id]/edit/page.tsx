import { notFound, redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import type { PnLRow } from '@/lib/schemas/pnl';
import { getPnLSheet } from '@/modules/pnl/server/actions';
import { PnLSheetEditView } from '@/modules/pnl/ui/views/pnl-sheet-edit-view';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PnLSheetEditPage({ params }: Props) {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const { id } = await params;
  const res = await getPnLSheet(id);
  if (!res.success || !res.data) notFound();

  const sheet = res.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PnLSheetEditView
        sheet={{
          id: sheet.id,
          name: sheet.name,
          projectName: sheet.projectName,
          notes: sheet.notes,
          scenarios: sheet.scenarios as string[],
          rows: sheet.rows as unknown as PnLRow[],
        }}
      />
    </div>
  );
}
