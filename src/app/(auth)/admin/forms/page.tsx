import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import getSession from '@/lib/auth/session';
import { listForms } from '@/modules/forms/server/actions';

export default async function FormsAdminPage() {
  const session = await getSession();
  console.log('FormsAdminPage - session:', {
    id: session.id,
    name: session.name,
    isAdmin: session.isAdmin,
  });
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const result = await listForms(session.id);

  if (!result.success) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">{result.error}</p>
      </div>
    );
  }

  const forms = result.data || [];

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
            <p className="mb-4 text-neutral-500">생성된 폼이 없습니다</p>
            <Link href="/admin/forms/new">
              <Button>첫 폼 만들기</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {forms.map((form) => (
            <Link key={form.id} href={`/admin/forms/${form.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-1 text-lg">
                        {form.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {form.description || '설명 없음'}
                      </CardDescription>
                    </div>
                    <span
                      className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${
                        form.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : form.status === 'closed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {form.status === 'published'
                        ? '게시됨'
                        : form.status === 'closed'
                          ? '마감'
                          : '임시저장'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-neutral-500">
                    <span>/{form.slug}</span>
                    <span>{form._count.submissions}개 제출</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
