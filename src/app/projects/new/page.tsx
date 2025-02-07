import React from 'react';
import ProjectForm from '@/components/page/project/project-form';
import { Metadata } from 'next';
import getSession from '@/lib/session';

export const metadata: Metadata = {
  title: '프로젝트 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  const session = await getSession();
  return (
    <div>
      <ProjectForm mode={'create'} userId={session.id} />
    </div>
  );
};

export default Page;
