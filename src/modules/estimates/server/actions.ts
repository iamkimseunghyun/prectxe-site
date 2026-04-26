'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import { computeLineAmount } from '@/lib/estimates/calc';
import {
  type CreateEstimateFromSheetInput,
  createEstimateFromSheetSchema,
  type EstimateInput,
  estimateSchema,
  type LineItem,
  type SupplierProfileInput,
  supplierProfileSchema,
} from '@/lib/schemas/estimate';
import type { PnLRow } from '@/lib/schemas/pnl';

const SUPPLIER_ID = 'singleton';

// ───────── Supplier Profile ─────────

export async function getSupplierProfile() {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const profile = await prisma.supplierProfile.findUnique({
    where: { id: SUPPLIER_ID },
  });
  return { success: true as const, data: profile };
}

export async function upsertSupplierProfile(data: SupplierProfileInput) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  try {
    const parsed = supplierProfileSchema.parse(data);
    const saved = await prisma.supplierProfile.upsert({
      where: { id: SUPPLIER_ID },
      create: {
        id: SUPPLIER_ID,
        companyName: parsed.companyName,
        businessNo: parsed.businessNo ?? null,
        ceo: parsed.ceo ?? null,
        address: parsed.address ?? null,
        phone: parsed.phone ?? null,
        email: parsed.email || null,
        contactName: parsed.contactName ?? null,
        contactPhone: parsed.contactPhone ?? null,
        sealUrl: parsed.sealUrl ?? null,
        defaultValidityDays: parsed.defaultValidityDays,
        watermarkText: parsed.watermarkText ?? null,
      },
      update: {
        companyName: parsed.companyName,
        businessNo: parsed.businessNo ?? null,
        ceo: parsed.ceo ?? null,
        address: parsed.address ?? null,
        phone: parsed.phone ?? null,
        email: parsed.email || null,
        contactName: parsed.contactName ?? null,
        contactPhone: parsed.contactPhone ?? null,
        sealUrl: parsed.sealUrl ?? null,
        defaultValidityDays: parsed.defaultValidityDays,
        watermarkText: parsed.watermarkText ?? null,
      },
    });
    revalidatePath('/admin/estimates/settings');
    return { success: true as const, data: saved };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : '저장 실패',
    };
  }
}

// ───────── Estimate Number ─────────

/** 견적번호 발번. Q-{YYYY}-{NNNN}. 같은 트랜잭션 내에서 카운터 증가. */
async function generateEstimateNumber(year: number): Promise<string> {
  const counter = await prisma.estimateCounter.upsert({
    where: { year },
    create: { year, last: 1 },
    update: { last: { increment: 1 } },
  });
  return `Q-${year}-${String(counter.last).padStart(4, '0')}`;
}

// ───────── Estimates ─────────

export async function listEstimates() {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const estimates = await prisma.estimate.findMany({
    orderBy: { issueDate: 'desc' },
    select: {
      id: true,
      number: true,
      title: true,
      issueDate: true,
      validUntil: true,
      recipient: true,
      lineItems: true,
      sourceSheet: { select: { id: true, name: true } },
    },
  });
  return { success: true as const, data: estimates };
}

export async function getEstimate(id: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate)
    return { success: false as const, error: '견적서를 찾을 수 없습니다' };
  return { success: true as const, data: estimate };
}

export async function createEstimateFromSheet(
  input: CreateEstimateFromSheetInput
) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  try {
    const parsed = createEstimateFromSheetSchema.parse(input);

    const sheet = await prisma.pnLSheet.findUnique({
      where: { id: parsed.sheetId },
    });
    if (!sheet)
      return { success: false as const, error: '원본 시트를 찾을 수 없습니다' };

    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: SUPPLIER_ID },
    });
    if (!supplier)
      return {
        success: false as const,
        error: '먼저 공급자 정보를 등록하세요',
      };

    // 시나리오 검증
    const scenarios = sheet.scenarios as string[];
    if (!scenarios.includes(parsed.scenario))
      return {
        success: false as const,
        error: '시나리오가 시트에 존재하지 않습니다',
      };

    // 선택된 행을 LineItem으로 변환
    const sheetRows = sheet.rows as unknown as PnLRow[];
    const selectedRows = sheetRows.filter(
      (r) => r.type === 'item' && parsed.itemRowIds.includes(r.id)
    );
    if (selectedRows.length === 0)
      return { success: false as const, error: '선택된 항목이 없습니다' };

    const lineItems: LineItem[] = selectedRows.map((row) => {
      const cell = row.values[parsed.scenario] ?? {
        qty: null,
        price: null,
        amount: null,
      };
      if (row.inputMode === 'qty_price') {
        return {
          id: row.id,
          label: row.label || '(이름 없음)',
          spec: null,
          qty: Number(cell.qty ?? 0),
          unitPrice: Number(cell.price ?? 0),
          note: null,
        };
      }
      // 금액 모드: 1 × amount
      return {
        id: row.id,
        label: row.label || '(이름 없음)',
        spec: null,
        qty: 1,
        unitPrice: Number(cell.amount ?? 0),
        note: null,
      };
    });

    const issueDate = new Date();
    const validUntil =
      parsed.validUntil ??
      new Date(
        issueDate.getTime() + supplier.defaultValidityDays * 24 * 60 * 60 * 1000
      );

    const number = await generateEstimateNumber(issueDate.getFullYear());

    // SupplierProfile snapshot (defaultValidityDays는 견적서 본문에 불필요)
    const supplierSnapshot = {
      companyName: supplier.companyName,
      businessNo: supplier.businessNo,
      ceo: supplier.ceo,
      address: supplier.address,
      phone: supplier.phone,
      email: supplier.email,
      contactName: supplier.contactName,
      contactPhone: supplier.contactPhone,
      sealUrl: supplier.sealUrl,
      watermarkText: supplier.watermarkText,
    };

    const created = await prisma.estimate.create({
      data: {
        number,
        title: parsed.title,
        issueDate,
        validUntil,
        supplier: supplierSnapshot,
        recipient: parsed.recipient,
        lineItems,
        sourceSheetId: parsed.sheetId,
        sourceScenario: parsed.scenario,
        userId: auth.userId,
      },
    });

    revalidatePath('/admin/estimates');
    return { success: true as const, data: { id: created.id, number } };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : '견적서 생성 실패',
    };
  }
}

/** 빈 견적서 생성 (PnL 시트 없이). 공급자 스냅샷 + 견적번호만 채우고 나머진 빈 상태. */
export async function createBlankEstimate() {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };

  const supplier = await prisma.supplierProfile.findUnique({
    where: { id: SUPPLIER_ID },
  });
  if (!supplier)
    return {
      success: false as const,
      error: '먼저 공급자 정보를 등록하세요',
    };

  const issueDate = new Date();
  const validUntil = new Date(
    issueDate.getTime() + supplier.defaultValidityDays * 24 * 60 * 60 * 1000
  );
  const number = await generateEstimateNumber(issueDate.getFullYear());

  const supplierSnapshot = {
    companyName: supplier.companyName,
    businessNo: supplier.businessNo,
    ceo: supplier.ceo,
    address: supplier.address,
    phone: supplier.phone,
    email: supplier.email,
    contactName: supplier.contactName,
    contactPhone: supplier.contactPhone,
    sealUrl: supplier.sealUrl,
    watermarkText: supplier.watermarkText,
  };

  const blankItem: LineItem = {
    id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    spec: null,
    qty: 1,
    unitPrice: 0,
    note: null,
  };

  const created = await prisma.estimate.create({
    data: {
      number,
      title: '새 견적서',
      issueDate,
      validUntil,
      supplier: supplierSnapshot,
      recipient: { companyName: '' },
      lineItems: [blankItem],
      userId: auth.userId,
    },
  });

  revalidatePath('/admin/estimates');
  return { success: true as const, data: { id: created.id, number } };
}

export async function updateEstimate(id: string, data: EstimateInput) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  try {
    const parsed = estimateSchema.parse(data);
    // 라인 아이템 합계 미리 계산해서 검증 (의미적 검사)
    parsed.lineItems.forEach((item) => {
      computeLineAmount(item); // throws if invalid
    });
    await prisma.estimate.update({
      where: { id },
      data: {
        title: parsed.title,
        issueDate: parsed.issueDate,
        validUntil: parsed.validUntil ?? null,
        supplier: parsed.supplier,
        recipient: parsed.recipient,
        lineItems: parsed.lineItems,
        notes: parsed.notes ?? null,
      },
    });
    revalidatePath('/admin/estimates');
    revalidatePath(`/admin/estimates/${id}/edit`);
    revalidatePath(`/admin/estimates/${id}/print`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : '견적서 저장 실패',
    };
  }
}

export async function deleteEstimate(id: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  try {
    await prisma.estimate.delete({ where: { id } });
    revalidatePath('/admin/estimates');
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : '견적서 삭제 실패',
    };
  }
}
