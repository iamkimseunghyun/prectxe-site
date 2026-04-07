import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import type { SupplierProfileInput } from '@/lib/schemas/estimate';
import { getSupplierProfile } from '@/modules/estimates/server/actions';
import { SupplierSettingsView } from '@/modules/estimates/ui/views/supplier-settings-view';

export default async function SupplierSettingsPage() {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const res = await getSupplierProfile();
  const profile = res.success && res.data ? res.data : null;

  const initial: SupplierProfileInput | null = profile
    ? {
        companyName: profile.companyName,
        businessNo: profile.businessNo,
        ceo: profile.ceo,
        address: profile.address,
        phone: profile.phone,
        email: profile.email,
        contactName: profile.contactName,
        contactPhone: profile.contactPhone,
        sealUrl: profile.sealUrl,
        defaultValidityDays: profile.defaultValidityDays,
        watermarkText: profile.watermarkText,
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <SupplierSettingsView initial={initial} />
    </div>
  );
}
