import { NextResponse } from 'next/server';
import { deleteArtist } from '@/modules/artists/server/actions';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await deleteArtist(id);

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Artist deletion failed:', e);
    return NextResponse.json(
      { ok: false, error: '삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
