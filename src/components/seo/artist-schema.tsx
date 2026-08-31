import { BUSINESS_INFO } from '@/lib/constants/business-info';
import { getImageUrl } from '@/lib/utils';

type ArtistForSEO = {
  id: string;
  name: string;
  nameKr?: string | null;
  mainImageUrl?: string | null;
  homepage?: string | null;
  instagram?: string | null;
  soundcloud?: string | null;
  bandcamp?: string | null;
  youtube?: string | null;
  spotify?: string | null;
};

const ArtistSchema = ({ artist }: { artist: ArtistForSEO }) => {
  const url = `${BUSINESS_INFO.serviceUrl}/artists/${artist.id}`;

  // sameAs는 배열이 표준이다. 예전에는 homepage 하나만, 그것도 문자열로
  // 넣어서 나머지 소셜 프로필이 전부 구조화 데이터에서 빠져 있었다.
  const sameAs = [
    artist.homepage,
    artist.instagram,
    artist.soundcloud,
    artist.bandcamp,
    artist.youtube,
    artist.spotify,
  ].filter((v): v is string => !!v);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artist.name,
    alternateName: artist.nameKr || undefined,
    image: artist.mainImageUrl
      ? getImageUrl(artist.mainImageUrl, 'public')
      : undefined,
    url,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };

  const clean = JSON.parse(JSON.stringify(jsonLd));
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data injection
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(clean).replace(/</g, '\\u003c'),
      }}
    />
  );
};

export default ArtistSchema;
