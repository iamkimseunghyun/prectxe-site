import { getArtworksPage } from '@/modules/artworks/server/actions';
import { AdminHeader } from '@/components/admin/admin-header';
import { ArtworkTable } from '../components/artwork-table';

export async function ArtworkAdminListView() {
  const artworks = await getArtworksPage(0, 100);

  return (
    <div>
      <AdminHeader
        title="Artworks"
        description="작품을 등록하고 관리합니다."
        actionLabel="새 작품"
        actionHref="/artworks/new"
      />
      <ArtworkTable data={artworks} />
    </div>
  );
}
