import ProjectForm from '@/components/page/project/project-form';
import React from 'react';
import { getProjectById } from '@/app/projects/actions';
import { Metadata } from 'next';
import { getArtists } from '@/app/artists/actions';

export const metadata: Metadata = {
  title: '프로젝트 수정',
  robots: { index: false, follow: false },
};

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const projectId = (await params).id;
  const projectData = await getProjectById(projectId);

  if (!projectData) {
    return <div>Project not found</div>;
  }

  const formattedData = {
    mainImageUrl: projectData.mainImageUrl,
    title: projectData.title,
    about: projectData.about,
    description: projectData.description,
    year: projectData.year,
    category: projectData.category,
    startDate: projectData.startDate,
    endDate: projectData.endDate,
    images: projectData.images,
    projectArtists: projectData.projectArtists,
  };

  const artists = await getArtists();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <ProjectForm
          mode={'edit'}
          projectId={projectId}
          initialData={formattedData}
          artists={artists}
        />
      </div>
    </div>
  );
};

export default Page;
