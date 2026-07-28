import { BUSINESS_INFO } from '@/lib/constants/business-info';

type ProgramForSEO = {
  title: string;
  summary?: string | null;
  description?: string | null;
  type: 'exhibition' | 'live' | 'party' | 'workshop' | 'talk';
  startAt?: string | null;
  endAt?: string | null;
  city?: string | null;
  venue?: string | null;
  heroUrl?: string | null;
  slug: string;
};

const ProgramSchema = ({ program }: { program: ProgramForSEO }) => {
  // 일정이 있는 프로그램에 대해 Event JSON-LD 생성 (아카이브 포함)
  if (!program.startAt) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: program.title,
    description: program.summary || program.description || undefined,
    startDate: program.startAt,
    endDate: program.endAt || undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: program.venue || undefined,
      address: {
        '@type': 'PostalAddress',
        addressLocality: program.city || undefined,
      },
    },
    image: program.heroUrl ? [program.heroUrl] : undefined,
    url: `${BUSINESS_INFO.serviceUrl}/programs/${program.slug}`,
    organizer: {
      '@type': 'Organization',
      name: 'PRECTXE',
      url: BUSINESS_INFO.serviceUrl,
    },
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

export default ProgramSchema;
