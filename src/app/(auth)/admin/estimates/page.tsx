import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { computeEstimateTotals } from '@/lib/estimates/calc';
import type { LineItem, Recipient } from '@/lib/schemas/estimate';
import {
  getSupplierProfile,
  listEstimates,
} from '@/modules/estimates/server/actions';
import { EstimateDashboardView } from '@/modules/estimates/ui/views/estimate-dashboard-view';

export default async function EstimatesAdminPage() {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const [estimatesRes, supplierRes] = await Promise.all([
    listEstimates(),
    getSupplierProfile(),
  ]);

  const estimatesRaw = estimatesRes.success ? estimatesRes.data : [];
  const hasSupplierProfile = supplierRes.success && !!supplierRes.data;

  const estimates = estimatesRaw.map((e) => {
    const items = e.lineItems as unknown as LineItem[];
    const recipient = e.recipient as unknown as Recipient;
    const totals = computeEstimateTotals(items);
    return {
      id: e.id,
      number: e.number,
      title: e.title,
      issueDate: e.issueDate,
      validUntil: e.validUntil,
      recipientName: recipient.companyName,
      total: totals.total,
      sourceSheet: e.sourceSheet,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <EstimateDashboardView
        estimates={estimates}
        hasSupplierProfile={hasSupplierProfile}
      />
    </div>
  );
}
