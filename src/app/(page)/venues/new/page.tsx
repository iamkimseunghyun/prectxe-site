import type { Metadata } from 'next';
import getSession from '@/lib/auth/session';
import VenueFormView from '@/modules/venues/ui/views/venue-form-view';

export const metadata: Metadata = {
  title: '장소 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  const session = await getSession();
  return <VenueFormView mode={'create'} userId={session.id} />;
};

export default Page;
