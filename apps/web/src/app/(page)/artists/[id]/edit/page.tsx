import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { getArtistById } from '@/modules/artists/server/queries';
import ArtistFormView from '@/modules/artists/ui/views/artist-form-view';

export const metadata: Metadata = {
  title: '아티스트 수정',
  robots: { index: false, follow: false },
};

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  // 미들웨어와 별개로 페이지 자체에서도 방어한다(/artists/new와 동일한 가드).
  // 편집 폼은 email 같은 비공개 필드를 노출하므로 로그인만으로는 부족하다.
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const { id } = await params;
  const initialData = await getArtistById(id);

  if (!initialData) notFound();

  return <ArtistFormView mode="edit" initialData={initialData} artistId={id} />;
};

export default Page;
