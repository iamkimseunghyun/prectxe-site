import type { Metadata } from 'next';
import React from 'react';
import getSession from '@/lib/auth/session';
import { getArtistsPage } from '@/modules/artists/server/actions';
import ProjectFormView from '@/modules/projects/ui/views/project-form-view';

export const metadata: Metadata = {
  title: '프로젝트 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  const artists = await getArtistsPage();
  const session = await getSession();
  return (
    <div>
      <ProjectFormView mode={'create'} userId={session.id} artists={artists} />
    </div>
  );
};

export default Page;
