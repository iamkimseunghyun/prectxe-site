import { prisma } from '@/lib/db/prisma';
import { formatArtistName } from '@/lib/utils';
import { ArtistMarquee } from './artist-marquee';

/**
 * 홈페이지 Global Network 섹션.
 * PRECTXE와 작업한 아티스트(프로그램·드롭 크레딧 보유) 이름을 마퀴로 흘림.
 * 독립 데이터베이스가 아닌 "함께한 네트워크" 사회적 증거로서의 노출.
 * 아티스트 상세 페이지로 링크하지 않음 — 맥락은 프로그램·드롭에서.
 */
export async function ArtistMarqueeSection() {
  const artists = await prisma.artist.findMany({
    where: {
      OR: [{ programCredits: { some: {} } }, { dropCredits: { some: {} } }],
    },
    select: { id: true, name: true, nameKr: true },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  if (artists.length === 0) return null;

  const names = artists.map((a) => formatArtistName(a.nameKr, a.name));

  return (
    <section className="bg-neutral-950 py-24 text-white md:py-32">
      <div className="mx-auto mb-10 max-w-screen-2xl px-6 md:mb-14 md:px-12 lg:px-24">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
          Global Network
        </p>
      </div>
      <ArtistMarquee names={names} />
    </section>
  );
}
