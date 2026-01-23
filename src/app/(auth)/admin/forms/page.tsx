import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import getSession from '@/lib/auth/session';
import { listForms } from '@/modules/forms/server/actions';
import { FormCard } from '@/modules/forms/ui/components/form-card';

export default async function FormsAdminPage() {
  const session = await getSession();
  console.log('FormsAdminPage - session:', {
    id: session.id,
    name: session.name,
    isAdmin: session.isAdmin,
  });
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const result = await listForms(session.id);

  const forms = result.success ? result.data || [] : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">폼 관리</h1>
          <p className="text-sm text-neutral-500">
            참가 신청서, 설문조사 등 동적 폼을 생성하고 관리합니다
          </p>
        </div>
        <Link href="/admin/forms/new">
          <Button>새 폼 만들기</Button>
        </Link>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            {!result.success ? (
              <>
                <p className="mb-4 text-red-600">{result.error}</p>
                <Link href="/admin/forms/new">
                  <Button>새 폼 만들기</Button>
                </Link>
              </>
            ) : (
              <>
                <p className="mb-4 text-neutral-500">생성된 폼이 없습니다</p>
                <Link href="/admin/forms/new">
                  <Button>첫 폼 만들기</Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {forms.map((form) => (
            <FormCard key={form.id} form={form} />
          ))}
        </div>
      )}
    </div>
  );
}
