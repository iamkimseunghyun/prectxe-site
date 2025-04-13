import { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';
import { getProjectWithCache } from '@/modules/projects/server/actions';
import { ProjectDetailView } from '@/modules/projects/ui/view/project-detail-view';
import { formatDateForInput } from '@/lib/utils';

// src/app/projects/[id]/page.tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectWithCache(id);

  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }

  const artists = project.projectArtists
    .map((pa) => `${pa.artist.nameKr} (${pa.artist.name})`)
    .join(', ');

  const venues = project.venues
    .map((v) => `${v.venue.name} (${v.venue.address})`)
    .join(', ');

  return {
    title: project.title,
    description: `${project.about} - ${project.description.slice(0, 100)}`,
    openGraph: {
      title: project.title,
      description: project.description.slice(0, 160),
      images: project.mainImageUrl
        ? [{ url: project.mainImageUrl }]
        : undefined,
      type: 'article',
    },
    other: {
      'project:category': project.category,
      'project:year': project.year.toString(),
      'project:artists': artists,
      'project:venues': venues,
      'project:duration': `${formatDateForInput(project.startDate)} - ${formatDateForInput(project.endDate)}`,
    },
  };
}

export async function generateStaticParams() {
  const projects = await prisma.project.findMany({
    select: { id: true },
  });

  return projects.map((project) => ({
    id: project.id,
  }));
}

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  return <ProjectDetailView id={id} />;
};

export default Page;
