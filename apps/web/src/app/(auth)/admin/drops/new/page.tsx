import { DropFormView } from '@/modules/drops/ui/admin/drop-form-view';
import { getVenueOptions } from '@/modules/venues/server/actions';

export default async function Page() {
  const venues = await getVenueOptions();
  return <DropFormView venues={venues} />;
}
