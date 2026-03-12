import type { Metadata } from 'next';

import { getVenueById } from '@/modules/venues/server/actions';
import VenueFormView from '@/modules/venues/ui/views/venue-form-view';

export const metadata: Metadata = {
  title: '장소 프로필 수정',
  robots: {
    index: false,
    follow: false,
  },
};

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const initialData = await getVenueById(id);
  if (!initialData) {
    return <div>Venue not found</div>;
  }

  return <VenueFormView mode={'edit'} initialData={initialData} venueId={id} />;
};

export default Page;
