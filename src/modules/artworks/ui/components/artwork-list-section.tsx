import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';
import { getArtworksByArtistId } from '@/modules/artworks/server/actions';

const ArtworkListSection = async ({ artistId }: { artistId: string }) => {
  const works = await getArtworksByArtistId(artistId);

  if (works.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        등록된 작품이 없습니다.
      </div>
    );
  }

  return (
    <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {works.map((work) => (
        <li key={work.id}>
          <Link
            href={`/artworks/${work.id}`}
            className="group relative block aspect-square overflow-hidden rounded-lg bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            <Image
              // getImageUrl은 값이 없으면 이미 로컬 placeholder를 반환한다.
              // 예전의 `${...} || '/api/placeholder/400/400'`는 템플릿 리터럴이
              // falsy가 될 수 없어 죽은 코드였다.
              src={getImageUrl(work.images?.[0]?.imageUrl, 'smaller')}
              alt={work.title}
              fill
              sizes="(min-width: 1152px) 360px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* 모바일(터치)에서는 hover가 없어 제목이 영영 보이지 않았다.
                기본 노출 → 데스크톱에서만 hover/focus로 드러내는 방식으로 전환. */}
            <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
              <div className="absolute bottom-0 p-4 text-white">
                <h3 className="font-medium">{work.title}</h3>
                {work.year && <p className="text-sm">{work.year}</p>}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default ArtworkListSection;
