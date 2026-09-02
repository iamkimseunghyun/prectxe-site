import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import {
  asciiFilename,
  contentDisposition,
  safeFilename,
  toCsv,
  toXlsx,
} from '@/lib/export/spreadsheet';
import { buildSubmissionsAoa } from '@/lib/forms/submissions-table';

/**
 * 폼 응답 내보내기.
 *
 * 예전에는 브라우저에서 xlsx로 직접 파일을 만들었다. 서버로 옮긴 이유:
 * - CSV 수식 인젝션 방어(toCsv)가 붙는다. 폼 응답은 외부인이 채우는 값이라
 *   `=...`로 시작하는 답변이 어드민 엑셀에서 수식으로 실행될 수 있었다
 * - 한글 파일명을 Content-Disposition에 안전하게 싣는다
 * - 취약점이 남은 xlsx 패키지를 걷어낸다
 */
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
  const format = new URL(req.url).searchParams.get('format') ?? 'xlsx';

  if (format !== 'csv' && format !== 'xlsx') {
    return NextResponse.json(
      { success: false, error: 'Invalid format' },
      { status: 400 }
    );
  }

  try {
    const form = await prisma.form.findUnique({
      where: { id },
      select: { title: true, fields: { orderBy: { order: 'asc' } } },
    });
    if (!form) {
      return NextResponse.json(
        { success: false, error: '폼을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const submissions = await prisma.formSubmission.findMany({
      where: { formId: id },
      select: {
        id: true,
        submittedAt: true,
        responses: {
          select: {
            fieldId: true,
            fieldLabel: true,
            value: true,
            field: { select: { id: true, label: true, archived: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const aoa = buildSubmissionsAoa(form.fields, submissions);
    const filename = safeFilename(`${form.title}_응답`, format, 'responses');
    const disposition = contentDisposition(
      filename,
      asciiFilename('form-responses', format)
    );

    if (format === 'csv') {
      return new Response(toCsv(aoa), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': disposition,
          'Cache-Control': 'no-store',
        },
      });
    }

    const buf = await toXlsx(aoa, `${form.title} 응답`, {
      // 제출시간 + 응답 컬럼들. 응답 폭은 넉넉히 잡는다.
      columnWidths: [22, ...aoa[0].slice(1).map(() => 30)],
    });
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': disposition,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('폼 응답 내보내기 오류:', error);
    return NextResponse.json(
      { success: false, error: '내보내기에 실패했습니다' },
      { status: 500 }
    );
  }
}
