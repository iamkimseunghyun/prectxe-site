import { BUSINESS_INFO } from '@/lib/constants/business-info';

type VenueForSEO = {
  id: string;
  name: string;
  address: string;
  images?: { imageUrl: string }[];
};

const VenueSchema = ({ venue }: { venue: VenueForSEO }) => {
  const url = `${BUSINESS_INFO.serviceUrl}/venues/${venue.id}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: venue.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: venue.address,
    },
    image:
      venue.images && venue.images.length > 0
        ? venue.images.map((img) => img.imageUrl)
        : undefined,
    url,
  };

  const clean = JSON.parse(JSON.stringify(jsonLd));
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(clean) }}
    />
  );
};

export default VenueSchema;
