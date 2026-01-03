import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok)
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: 401 }
      );
    const { slug } = await params;
    await prisma.article.delete({ where: { slug } });
    revalidatePath('/admin/journal');
    revalidatePath('/journal');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: '삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
