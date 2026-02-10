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
    if (!auth.success)
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    const { slug } = await params;
    await prisma.article.delete({ where: { slug } });
    revalidatePath('/admin/journal');
    revalidatePath('/journal');
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: '삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
