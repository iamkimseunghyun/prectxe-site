import {
  ProjectCategory,
  ProjectWithRelations,
} from '@/lib/validations/schema';

const categoryToSchemaType: Record<ProjectCategory, string> = {
  exhibition: 'ExhibitionEvent',
  performance: 'PerformanceEvent',
  festival: 'Festival',
  workshop: 'EducationEvent',
};

const ProjectSchema = ({ project }: { project: ProjectWithRelations }) => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': categoryToSchemaType[project.category] || 'Event',
    name: project.title,
    description: project.description,
    about: project.about,
    // 일시
    startDate: project.startDate.toISOString(),
    endDate: project.endDate.toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    // 장소
    location: project.venues.map((venue) => ({
      '@type': 'Place',
      name: venue.venue.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: venue.venue.address,
      },
      description: venue.venue.description,
    })),
    // 참여 아티스트
    performer: project.projectArtists.map((pa) => ({
      '@type': 'Person',
      name: `${pa.artist.nameKr} (${pa.artist.name})`,
    })),
    // 이미지
    image: [
      project.mainImageUrl,
      ...project.images.map((img) => ({
        '@type': 'ImageObject',
        url: img.imageUrl,
        caption: img.alt,
        position: img.order,
      })),
    ],
    // 연도 정보
    copyrightYear: project.year,
    // PRECTXE 관련 정보
    organizer: {
      '@type': 'Organization',
      name: 'PRECTXE',
      url: 'https://prectxe.com',
    },
    // URL 및 메타데이터
    url: `https://prectxe.com/projects/${project.id}`,
    datePublished: project.createdAt.toISOString(),
    dateModified: project.updatedAt.toISOString(),
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

export default ProjectSchema;
