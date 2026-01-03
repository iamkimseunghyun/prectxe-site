import { ProjectCategory, projectSchema } from '@/lib/schemas';
import { z } from 'zod';

const categoryToSchemaType: Record<ProjectCategory, string> = {
  exhibition: 'ExhibitionEvent',
  performance: 'PerformanceEvent',
  festival: 'Festival',
  workshop: 'EducationEvent',
};

export const PSchema = projectSchema.extend({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  projectArtists: z
    .array(
      z.object({
        nameKr: z.string(),
        name: z.string(),
      })
    )
    .default([]),
  venues: z
    .array(
      z.object({
        name: z.string(),
        address: z.string(),
        description: z.string(),
      })
    )
    .default([]),
});

export type ProjectSchemaSEO = z.infer<typeof PSchema>;

const ProjectSchema = ({ project }: { project: ProjectSchemaSEO }) => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': categoryToSchemaType[project.category] || 'Event',
    name: project.title,
    description: project.description,
    about: project.about,
    // 일시
    startDate: project.startDate,
    endDate: project.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    // 장소
    location: project.venues.map((venue) => ({
      '@type': 'Place',
      name: venue.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: venue.address,
      },
      description: venue.description,
    })),
    // 참여 아티스트
    performer: project.projectArtists.map((pa) => ({
      '@type': 'Person',
      name: formatArtistName(pa.nameKr as any, pa.name as any),
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
import { formatArtistName } from '@/lib/utils';
