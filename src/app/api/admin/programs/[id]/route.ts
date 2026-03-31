import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { deleteProgram } from '@/modules/programs/server/actions';

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

    const result = await deleteProgram(id);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? '삭제에 실패했습니다.' },
        { status: 400 }
      );
    }

    revalidatePath('/admin/programs');
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : '삭제에 실패했습니다.';
    console.error('프로그램 삭제 API 에러:', message, e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
