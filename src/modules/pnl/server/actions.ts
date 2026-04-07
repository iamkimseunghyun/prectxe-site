'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import {
  buildDefaultRows,
  DEFAULT_SCENARIOS,
} from '@/lib/pnl/default-template';
import {
  type PnLSheetInput,
  type PnLTemplateInput,
  pnlSheetSchema,
  pnlTemplateSchema,
} from '@/lib/schemas/pnl';

// ───────── Templates ─────────

export async function listPnLTemplates() {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const templates = await prisma.pnLTemplate.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
      _count: { select: { sheets: true } },
    },
  });
  return { success: true as const, data: templates };
}

export async function getPnLTemplate(id: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const template = await prisma.pnLTemplate.findUnique({ where: { id } });
  if (!template)
    return { success: false as const, error: '템플릿을 찾을 수 없습니다' };
  return { success: true as const, data: template };
}

export async function createPnLTemplate(data: PnLTemplateInput) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  try {
    const parsed = pnlTemplateSchema.parse(data);
    const created = await prisma.pnLTemplate.create({
      data: {
        name: parsed.name,
        description: parsed.description ?? null,
        scenarios: parsed.scenarios,
        rows: parsed.rows,
        userId: auth.userId,
      },
    });
    revalidatePath('/admin/pnl');
    return { success: true as const, data: { id: created.id } };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : '템플릿 생성 실패',
    };
  }
}

export async function updatePnLTemplate(id: string, data: PnLTemplateInput) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  try {
    const parsed = pnlTemplateSchema.parse(data);
    await prisma.pnLTemplate.update({
      where: { id },
      data: {
        name: parsed.name,
        description: parsed.description ?? null,
        scenarios: parsed.scenarios,
        rows: parsed.rows,
      },
    });
    revalidatePath('/admin/pnl');
    revalidatePath(`/admin/pnl/templates/${id}/edit`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : '템플릿 수정 실패',
    };
  }
}

export async function deletePnLTemplate(id: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  try {
    await prisma.pnLTemplate.delete({ where: { id } });
    revalidatePath('/admin/pnl');
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : '템플릿 삭제 실패',
    };
  }
}

export async function createDefaultPnLTemplate() {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const created = await prisma.pnLTemplate.create({
    data: {
      name: '기본 프로그램 PnL',
      description:
        '수익(티켓·굿즈·스폰서)·비용(인건비·공간·제작·홍보) 기본 구조',
      scenarios: DEFAULT_SCENARIOS,
      rows: buildDefaultRows(),
      userId: auth.userId,
    },
  });
  revalidatePath('/admin/pnl');
  return { success: true as const, data: { id: created.id } };
}

// ───────── Sheets ─────────

export async function listPnLSheets() {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const sheets = await prisma.pnLSheet.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      projectName: true,
      updatedAt: true,
      template: { select: { id: true, name: true } },
    },
  });
  return { success: true as const, data: sheets };
}

export async function getPnLSheet(id: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const sheet = await prisma.pnLSheet.findUnique({ where: { id } });
  if (!sheet)
    return { success: false as const, error: '시트를 찾을 수 없습니다' };
  return { success: true as const, data: sheet };
}

export async function createPnLSheet(input: {
  name: string;
  templateId?: string | null;
}) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };

  let scenarios: string[] = DEFAULT_SCENARIOS;
  let rows = buildDefaultRows();

  if (input.templateId) {
    const tpl = await prisma.pnLTemplate.findUnique({
      where: { id: input.templateId },
      select: { scenarios: true, rows: true },
    });
    if (!tpl)
      return { success: false as const, error: '템플릿을 찾을 수 없습니다' };
    scenarios = tpl.scenarios as string[];
    rows = tpl.rows as ReturnType<typeof buildDefaultRows>;
  }

  const created = await prisma.pnLSheet.create({
    data: {
      name: input.name,
      scenarios,
      rows,
      templateId: input.templateId ?? null,
      userId: auth.userId,
    },
  });
  revalidatePath('/admin/pnl');
  return { success: true as const, data: { id: created.id } };
}

export async function updatePnLSheet(id: string, data: PnLSheetInput) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  try {
    const parsed = pnlSheetSchema.parse(data);
    await prisma.pnLSheet.update({
      where: { id },
      data: {
        name: parsed.name,
        projectName: parsed.projectName ?? null,
        notes: parsed.notes ?? null,
        scenarios: parsed.scenarios,
        rows: parsed.rows,
      },
    });
    revalidatePath('/admin/pnl');
    revalidatePath(`/admin/pnl/sheets/${id}/edit`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : '시트 저장 실패',
    };
  }
}

export async function deletePnLSheet(id: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  try {
    await prisma.pnLSheet.delete({ where: { id } });
    revalidatePath('/admin/pnl');
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : '시트 삭제 실패',
    };
  }
}

export async function saveSheetAsTemplate(
  sheetId: string,
  templateName: string
) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const sheet = await prisma.pnLSheet.findUnique({ where: { id: sheetId } });
  if (!sheet)
    return { success: false as const, error: '시트를 찾을 수 없습니다' };

  // 값 비우기 (구조만 보존)
  const sheetRows = sheet.rows as ReturnType<typeof buildDefaultRows>;
  const blankRows = sheetRows.map((row) => ({
    ...row,
    values: Object.fromEntries(
      (sheet.scenarios as string[]).map((s) => [
        s,
        { qty: null, price: null, amount: null },
      ])
    ),
  }));

  const created = await prisma.pnLTemplate.create({
    data: {
      name: templateName,
      scenarios: sheet.scenarios as string[],
      rows: blankRows,
      userId: auth.userId,
    },
  });
  revalidatePath('/admin/pnl');
  return { success: true as const, data: { id: created.id } };
}
