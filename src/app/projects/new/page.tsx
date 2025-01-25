import React, { Suspense } from 'react';
import ProjectForm from '@/components/project/project-form';

const Page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProjectForm mode={'create'} />
    </Suspense>
  );
};

export default Page;
