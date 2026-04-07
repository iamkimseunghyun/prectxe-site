import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import { buildSheetTable, safeFilename, toCsv, toXlsx } from '@/lib/pnl/export';
import type { PnLRow } from '@/lib/schemas/pnl';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: 401 }
    );
  }

  const { id } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get('format') ?? 'xlsx';

  if (format !== 'csv' && format !== 'xlsx') {
    return NextResponse.json(
      { success: false, error: 'Invalid format' },
      { status: 400 }
    );
  }

  const sheet = await prisma.pnLSheet.findUnique({ where: { id } });
  if (!sheet) {
    return NextResponse.json(
      { success: false, error: '시트를 찾을 수 없습니다' },
      { status: 404 }
    );
  }

  const built = buildSheetTable({
    name: sheet.name,
    projectName: sheet.projectName,
    notes: sheet.notes,
    scenarios: sheet.scenarios as string[],
    rows: sheet.rows as unknown as PnLRow[],
  });

  const filename = safeFilename(sheet.name, format);

  if (format === 'csv') {
    const csv = toCsv(built);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const buf = await toXlsx(built, sheet.name);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  });
}
