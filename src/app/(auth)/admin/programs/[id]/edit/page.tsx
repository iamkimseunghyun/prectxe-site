import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { updateProgram } from '@/modules/programs/server/actions';
import { ProgramFormView } from '@/modules/programs/ui/views/program-form-view';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: 'asc' } },
      credits: { include: { artist: true } },
    },
  });
  if (!program) redirect('/admin/programs');

  async function onSubmit(formData: any) {
    'use server';
    const session = await getSession();
    if (!session.id) return { success: false, error: '인증이 필요합니다.' };
    const { intent, ...data } = formData || {};
    const res = await updateProgram(id, data);
    if (res?.success) {
      let redirectTo = '/admin/programs';
      if (intent === 'continue') {
        redirectTo = `/admin/programs/${id}/edit`;
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">프로그램 편집</h1>
      </div>
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
          images: program.images.map((i) => ({
            imageUrl: i.imageUrl,
            alt: i.alt,
            order: i.order,
          })),
          credits: program.credits.map((c) => ({
            artistId: c.artistId,
            role: c.role,
            artist: c.artist,
          })),
        }}
      />
    </div>
  );
}
