type ProgramForSEO = {
  title: string;
  summary?: string | null;
  description?: string | null;
  status: 'upcoming' | 'completed';
  type: 'exhibition' | 'live' | 'party' | 'workshop' | 'talk';
  startAt?: string | null;
  endAt?: string | null;
  city?: string | null;
  venue?: string | null;
  heroUrl?: string | null;
  slug: string;
};

const ProgramSchema = ({ program }: { program: ProgramForSEO }) => {
  // Only generate Event JSON-LD for upcoming
  if (program.status !== 'upcoming' || !program.startAt) return null;

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
    url: `https://prectxe.com/programs/${program.slug}`,
    organizer: {
      '@type': 'Organization',
      name: 'PRECTXE',
      url: 'https://prectxe.com',
    },
  };

  const clean = JSON.parse(JSON.stringify(jsonLd));
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(clean) }}
    />
  );
};

export default ProgramSchema;
