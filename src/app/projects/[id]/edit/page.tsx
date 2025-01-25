import ProjectForm from '@/components/project/project-form';
import React from 'react';
import { getProjectById } from '@/app/projects/actions/actions';

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const projectId = (await params).id;
  const projectData = await getProjectById(projectId);

  if (!projectData) {
    return <div>Project not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <ProjectForm
          mode={'edit'}
          projectId={projectId}
          initialData={projectData}
        />
      </div>
    </div>
  );
};

export default Page;
