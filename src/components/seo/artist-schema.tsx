import { BUSINESS_INFO } from '@/lib/constants/business-info';

type ArtistForSEO = {
  id: string;
  name: string;
  nameKr?: string | null;
  mainImageUrl?: string | null;
  homepage?: string | null;
};

const ArtistSchema = ({ artist }: { artist: ArtistForSEO }) => {
  const url = `${BUSINESS_INFO.serviceUrl}/artists/${artist.id}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artist.name,
    alternateName: artist.nameKr || undefined,
    image: artist.mainImageUrl || undefined,
    url,
    sameAs: artist.homepage || undefined,
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
