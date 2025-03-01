import ArtworkGrid from '@/components/page/artwork/artwork-grid';
import { Metadata } from 'next';
import { getAllArtworks } from '@/app/artworks/actions';
import React from 'react';

export const metadata: Metadata = {
  title: '작품 목록 | PRECTXE',
  description: 'PRECTXE에서 선보이는 모든 디지털 아트 작품들을 만나보세요.',
  openGraph: {
    title: '작품 목록 | PRECTXE',
    description: 'PRECTXE에서 선보이는 모든 디지털 아트 작품들을 만나보세요.',
  },
};

const Page = async () => {
  const artworks = await getAllArtworks();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">작품 소개</h1>
        <p className="max-w-2xl text-gray-600">
          지금까지 PRECTXE에서 소개된 훌륭한 작품들에 많은 관심을 가져주세요.
        </p>
      </div>
      <ArtworkGrid artworks={artworks} />
    </div>
  );
};

export default Page;
