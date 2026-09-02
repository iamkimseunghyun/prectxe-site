/**
 * 폼 읽기 쿼리.
 *
 * **'use server' 파일이 아니다.** 액션 파일에서 export하면 함수 하나하나가
 * 공개 RPC 엔드포인트가 된다 — 여기 있는 것들은 전부 서버 컴포넌트에서만
 * 호출되므로 엔드포인트로 노출할 이유가 없고, getFormSubmissions는 응답자
 * PII 전체를 반환한다.
 *
 * 클라이언트가 직접 부르는 것(제출·업로드 URL 발급·폼 CRUD)만 액션으로 둔다.
 */
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';

// Get Form by Slug (Public)
export async function getFormBySlug(slug: string) {
  try {
    const form = await prisma.form.findUnique({
      where: { slug, status: { not: 'draft' } },
      include: {
        fields: {
          where: { archived: false },
          orderBy: { order: 'asc' },
        },
      },
    });

    return { success: true, data: form };
  } catch (error) {
    console.error('Form fetch error:', error);
    return {
      success: false,
      error: '폼을 불러오는데 실패했습니다',
    };
  }
}

// Get Form Submissions (Admin only)
export async function getFormSubmissions(formId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        title: true,
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!form) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      include: {
        responses: {
          // field 전체(options/validation 등)를 응답마다 중복 로드하지 않도록
          // 뷰가 실제로 쓰는 필드만 select
          include: {
            field: {
              select: { id: true, label: true, type: true, archived: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return {
      success: true,
      data: {
        form: {
          title: form.title,
          fields: form.fields,
        },
        submissions,
      },
    };
  } catch (error) {
    console.error('Submissions fetch error:', error);
    return {
      success: false,
      error: '제출 내역을 불러오는데 실패했습니다',
    };
  }
}

// Get Form (Admin)
export async function getForm(formId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: {
          where: { archived: false },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!form) {
      return { success: false, error: '폼을 찾을 수 없습니다' };
    }

    return { success: true, data: form };
  } catch (error) {
    console.error('Form fetch error:', error);
    return {
      success: false,
      error: '폼을 불러오는데 실패했습니다',
    };
  }
}

// List Forms (Admin)
export async function listForms(filters?: {
  status?: 'draft' | 'published' | 'closed';
}) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: '권한이 없습니다' };
  try {
    const forms = await prisma.form.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        fields: {
          where: { archived: false },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return { success: true, data: forms };
  } catch (error) {
    console.error('Forms list error:', error);
    return {
      success: false,
      error: '폼 목록을 불러오는데 실패했습니다',
    };
  }
}
