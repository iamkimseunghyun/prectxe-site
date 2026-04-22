import getSession from '@/lib/auth/session';
import { createProgram } from '@/modules/programs/server/actions';
import { ProgramFormView } from '@/modules/programs/ui/views/program-form-view';
import { getVenueOptions } from '@/modules/venues/server/actions';

export default async function Page() {
  const venues = await getVenueOptions();
  async function onSubmit(formData: any) {
    'use server';
    const session = await getSession();
    if (!session.id) return { success: false, error: '인증이 필요합니다.' };
    const { intent, ...data } = formData || {};
    const res = await createProgram(data, session.id);
    if (res?.success) {
      let redirectTo = '/admin/programs';
      if (intent === 'continue' && res.data?.id) {
        redirectTo = `/admin/programs/${res.data.id}/edit`;
      } else if (intent === 'new') {
        redirectTo = '/admin/programs/new';
      }
      return { success: true, redirect: redirectTo };
    }
    return {
      success: false,
      error: (res as any)?.error ?? '저장에 실패했습니다.',
    };
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">새 프로그램</h1>
      <ProgramFormView onSubmit={onSubmit as any} venues={venues} />
    </div>
  );
}
