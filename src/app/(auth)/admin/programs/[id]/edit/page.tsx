import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { updateProgram } from '@/modules/programs/server/actions';
import { ProgramFormView } from '@/modules/programs/ui/views/program-form-view';

export async function generateStaticParams() {
  const programs = await prisma.program.findMany({ select: { id: true } });
  return programs.map((p) => ({ id: p.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await prisma.program.findUnique({ where: { id } });
  if (!program) redirect('/admin/programs');

  async function onSubmit(formData: any) {
    'use server';
    const session = await getSession();
    if (!session.id) redirect('/');
    const { intent, ...data } = formData || {};
    const res = await updateProgram(id, data);
    if (res?.ok) {
      if (intent === 'continue') redirect(`/admin/programs/${id}/edit`);
      if (intent === 'new') redirect(`/admin/programs/new`);
      redirect(`/admin/programs`);
    }
    return { ok: false, error: (res as any)?.error ?? '저장에 실패했습니다.' };
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">프로그램 편집</h1>
      <ProgramFormView
        onSubmit={onSubmit}
        initial={{
          id: program.id,
          title: program.title,
          slug: program.slug,
          summary: program.summary ?? undefined,
          description: program.description ?? undefined,
          type: program.type as any,
          status: program.status as any,
          startAt: program.startAt?.toISOString().split('T')[0],
          endAt: program.endAt?.toISOString().split('T')[0] ?? undefined,
          city: program.city ?? undefined,
          heroUrl: program.heroUrl ?? undefined,
          venue: program.venue ?? undefined,
          organizer: program.organizer ?? undefined,
        }}
      />
    </div>
  );
}
