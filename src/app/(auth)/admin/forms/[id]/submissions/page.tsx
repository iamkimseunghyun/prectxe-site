import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { getFormSubmissions } from '@/modules/forms/server/actions';
import { SubmissionsView } from '@/modules/forms/ui/views/submissions-view';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FormSubmissionsPage({ params }: PageProps) {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const { id } = await params;
  const result = await getFormSubmissions(id, session.id, session.isAdmin);

  if (!result.success || !result.data) {
    redirect('/admin/forms');
  }

  return <SubmissionsView data={result.data} />;
}
