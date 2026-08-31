import { User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatArtistName, getImageUrl } from '@/lib/utils';
import type { ArtistCardData } from '../../server/types';

interface ArtistCardProps {
  artist: ArtistCardData;
  /**
   * 첫 화면(above the fold) 카드에만 true. LCP 후보 이미지가 lazy로 남으면
   * 로딩이 한 박자 늦는다.
   */
  priority?: boolean;
}

const ArtistCard = ({ artist, priority = false }: ArtistCardProps) => {
  const location = [artist.city, artist.country].filter(Boolean).join(', ');
  const displayName = formatArtistName(
    artist.nameKr ?? null,
    artist.name ?? null
  );
  const visibleTags = (artist.tags ?? []).slice(0, 2);

  return (
    <Link
      href={`/artists/${artist.id}`}
      className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900"
    >
      <div className="relative aspect-4/5 overflow-hidden rounded-xl bg-neutral-100">
        {artist.mainImageUrl ? (
          <Image
            src={getImageUrl(artist.mainImageUrl, 'smaller')}
            alt={displayName}
            fill
            priority={priority}
            // 컨테이너는 max-w-6xl(1152px) 안의 3컬럼이라 실제 폭은 ~341px에서
            // 멈춘다. 33vw로 두면 와이드 화면에서 2배 크기를 받는다.
            sizes="(min-width: 1152px) 341px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User aria-hidden className="h-16 w-16 text-neutral-300" />
          </div>
        )}
      </div>

      <div className="mt-5 space-y-1.5">
        <h2 className="text-base font-medium leading-snug tracking-tight transition-colors group-hover:text-neutral-500 md:text-lg">
          {displayName}
        </h2>
        {artist.tagline && (
          <p className="line-clamp-2 text-sm text-neutral-500">
            {artist.tagline}
          </p>
        )}
        {(visibleTags.length > 0 || location) && (
          <p className="pt-1 text-xs uppercase tracking-[0.15em] text-neutral-400">
            {[...visibleTags, location].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </Link>
  );
};

export default ArtistCard;
