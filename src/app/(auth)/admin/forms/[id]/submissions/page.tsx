import { notFound, redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { getFormSubmissions } from '@/modules/forms/server/queries';
import { SubmissionsView } from '@/modules/forms/ui/views/submissions-view';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FormSubmissionsPage({ params }: PageProps) {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const { id } = await params;
  const result = await getFormSubmissions(id);

  // 이 지점에 오면 이미 어드민이 확인된 상태다. 조회 실패는 곧 없는 폼이므로
  // 목록으로 되돌리지 않고 404를 낸다(리다이렉트는 소프트 404가 된다).
  if (!result.success || !result.data) {
    notFound();
  }

  return <SubmissionsView formId={id} data={result.data} />;
}
