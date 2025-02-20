import ArtworkGrid from '@/components/page/artwork/artwork-grid';
import { Metadata } from 'next';
import { getAllArtworks } from '@/app/artworks/actions';
import getSession from '@/lib/session';
import canManage from '@/lib/can-manage';

export const metadata: Metadata = {
  title: '작품 목록 | PRECTXE',
  description: 'PRECTXE에서 선보이는 모든 디지털 아트 작품들을 만나보세요.',
  openGraph: {
    title: '작품 목록 | PRECTXE',
    description: 'PRECTXE에서 선보이는 모든 디지털 아트 작품들을 만나보세요.',
  },
};

const Page = async () => {
  const session = await getSession();
  const artworks = await getAllArtworks();

  const canEdit = await canManage(session.id!);

  return (
    <div className="mx-auto max-w-5xl py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">작품 목록</h1>
      </div>
      <ArtworkGrid artworks={artworks} />
    </div>
  );
};

export default Page;
