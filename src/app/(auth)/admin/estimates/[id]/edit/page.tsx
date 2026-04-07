import { notFound, redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import type { LineItem, Recipient } from '@/lib/schemas/estimate';
import { getEstimate } from '@/modules/estimates/server/actions';
import { EstimateEditView } from '@/modules/estimates/ui/views/estimate-edit-view';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EstimateEditPage({ params }: Props) {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const { id } = await params;
  const res = await getEstimate(id);
  if (!res.success || !res.data) notFound();

  const e = res.data;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <EstimateEditView
        estimate={{
          id: e.id,
          number: e.number,
          title: e.title,
          issueDate: e.issueDate.toISOString(),
          validUntil: e.validUntil ? e.validUntil.toISOString() : null,
          // biome-ignore lint/suspicious/noExplicitAny: snapshot JSON
          supplier: e.supplier as any,
          recipient: e.recipient as unknown as Recipient,
          lineItems: e.lineItems as unknown as LineItem[],
          notes: e.notes,
        }}
      />
    </div>
  );
}
