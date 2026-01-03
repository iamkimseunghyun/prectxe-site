import { AdminHeader } from '@/components/admin/admin-header';
import { getAllVenues } from '@/modules/venues/server/actions';
import { VenueTable } from '../components/venue-table';

export async function VenueAdminListView() {
  const { venues } = await getAllVenues(1, 100);

  return (
    <div>
      <AdminHeader
        title="Venues"
        description="장소를 등록하고 관리합니다."
        actionLabel="새 장소"
        actionHref="/venues/new"
      />
      <VenueTable data={venues} />
    </div>
  );
}
