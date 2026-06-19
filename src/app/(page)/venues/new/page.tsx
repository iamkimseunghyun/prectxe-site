import type { Metadata } from 'next';
import VenueFormView from '@/modules/venues/ui/views/venue-form-view';

export const metadata: Metadata = {
  title: '장소 등록',
  robots: { index: false, follow: false },
};

const Page = () => {
  return <VenueFormView mode={'create'} />;
};

export default Page;
