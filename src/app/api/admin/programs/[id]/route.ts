import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.success)
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    const { id } = await params;
    await prisma.program.delete({ where: { id } });
    revalidatePath('/admin/programs');
    revalidatePath('/programs');
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: '삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
