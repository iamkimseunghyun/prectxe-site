import type { Metadata } from 'next';
import React from 'react';
import { getArtistsPage } from '@/modules/artists/server/actions';
import { getProjectById } from '@/modules/projects/server/actions';
import ProjectFormView from '@/modules/projects/ui/views/project-form-view';

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

  const artists = await getArtistsPage();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <ProjectFormView
          mode={'edit'}
          projectId={projectId}
          initialData={projectData}
          artists={artists}
        />
      </div>
    </div>
  );
};

export default Page;
