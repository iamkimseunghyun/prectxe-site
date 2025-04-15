import { ArtworkResponse } from '@/lib/schemas/seo';

const ArtworkSchema = ({ artwork }: { artwork: ArtworkResponse }) => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: artwork.title,
    description: artwork.description || undefined,
    // 작가 정보
    creator: artwork.artists.map((art) => ({
      '@type': 'Person',
      name: `${art.artist.nameKr} (${art.artist.name})`,
    })),
    // 작품 속성
    artMedium: artwork.media || undefined,
    artform: artwork.style || undefined,
    dateCreated: artwork.year?.toString(),
    // 크기 정보 (있을 경우)
    ...(artwork.size
      ? {
          width: {
            '@type': 'Distance',
            name: artwork.size.split('x')[0]?.trim(),
          },
          height: {
            '@type': 'Distance',
            name: artwork.size.split('x')[1]?.trim(),
          },
        }
      : {}),
    // 이미지
    image: artwork.images.map((img) => ({
      '@type': 'ImageObject',
      url: img.imageUrl,
      caption: img.alt,
      position: img.order,
    })),
    // URL
    url: `https://prectxe.com/artworks/${artwork.id}`,
    // 메타데이터
    datePublished: new Date(artwork.createdAt),
    dateModified: new Date(artwork.updatedAt),
  };

  // null, undefined 값 제거
  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd) }}
    />
  );
};

export default ArtworkSchema;
