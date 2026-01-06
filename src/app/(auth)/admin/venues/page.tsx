import { VenueAdminListView } from '@/modules/venues/ui/views/venue-admin-list-view';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  return <VenueAdminListView page={page} />;
}
