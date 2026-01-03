import { NextResponse } from 'next/server';
import { listProgramsPaged } from '@/modules/programs/server/actions';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const type = searchParams.get('type') || undefined;
  const city = searchParams.get('city') || undefined;
  const search = searchParams.get('search') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '12', 10);

  try {
    const data = await listProgramsPaged({
      status: status as any,
      type,
      city,
      search,
      page,
      pageSize,
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
