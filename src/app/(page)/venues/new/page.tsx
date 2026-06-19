import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import VenueFormView from '@/modules/venues/ui/views/venue-form-view';

export const metadata: Metadata = {
  title: '장소 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');
  return <VenueFormView mode={'create'} />;
};

export default Page;
