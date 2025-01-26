import React from 'react';
import ProjectForm from '@/components/project/project-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '프로젝트 등록',
  robots: { index: false, follow: false },
};

const Page = () => {
  return (
    <div>
      <ProjectForm mode={'create'} />
    </div>
  );
};

export default Page;
