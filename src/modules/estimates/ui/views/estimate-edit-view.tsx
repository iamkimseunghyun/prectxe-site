'use client';

import { Plus, Printer, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  computeEstimateTotals,
  computeLineAmount,
  formatKRW,
  numberToKoreanAmount,
} from '@/lib/estimate/calc';
import type { LineItem, Recipient } from '@/lib/schemas/estimate';
import {
  deleteEstimate,
  updateEstimate,
} from '@/modules/estimates/server/actions';

interface SupplierSnapshot {
  companyName: string;
  businessNo: string | null;
  ceo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  contactName: string | null;
  contactPhone: string | null;
  sealUrl: string | null;
  watermarkText: string | null;
}

interface Props {
  estimate: {
    id: string;
    number: string;
    title: string;
    issueDate: string; // ISO
    validUntil: string | null; // ISO
    supplier: SupplierSnapshot;
    recipient: Recipient;
    lineItems: LineItem[];
    notes: string | null;
  };
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

export function EstimateEditView({ estimate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(estimate.title);
  const [issueDate, setIssueDate] = useState(toDateInput(estimate.issueDate));
  const [validUntil, setValidUntil] = useState(
    toDateInput(estimate.validUntil)
  );
  const [supplier, setSupplier] = useState<SupplierSnapshot>(estimate.supplier);
  const [recipient, setRecipient] = useState<Recipient>(estimate.recipient);
  const [items, setItems] = useState<LineItem[]>(estimate.lineItems);
  const [notes, setNotes] = useState(estimate.notes ?? '');

  const totals = computeEstimateTotals(items);

  function patchItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }
  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: uid('li'),
        label: '',
        spec: null,
        qty: 1,
        unitPrice: 0,
        note: null,
      },
    ]);
  }

  function patchSupplier<K extends keyof SupplierSnapshot>(
    key: K,
    value: SupplierSnapshot[K]
  ) {
    setSupplier((s) => ({ ...s, [key]: value }));
  }
  function patchRecipient<K extends keyof Recipient>(
    key: K,
    value: Recipient[K]
  ) {
    setRecipient((r) => ({ ...r, [key]: value }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateEstimate(estimate.id, {
        title,
        issueDate: new Date(issueDate),
        validUntil: validUntil ? new Date(validUntil) : null,
        supplier: {
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
        },
        recipient,
        lineItems: items,
        notes: notes || null,
      });
      if (!res.success) setError(res.error ?? '저장 실패');
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm('이 견적서를 삭제할까요? 되돌릴 수 없습니다.')) return;
    startTransition(async () => {
      const res = await deleteEstimate(estimate.id);
      if (!res.success) setError(res.error ?? '삭제 실패');
      else router.push('/admin/estimates');
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/estimates"
            className="text-xs text-muted-foreground hover:underline"
          >
            ← 견적서 목록
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            견적서 편집{' '}
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {estimate.number}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/estimates/${estimate.id}/print`} target="_blank">
            <Button type="button" variant="outline">
              <Printer className="mr-1 h-4 w-4" />
              인쇄/PDF
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={isPending}
          >
            삭제
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? '저장 중…' : '저장'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* 헤더 */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-3">
              <Label>제목</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>발행일자</Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>유효기간</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>견적번호</Label>
              <Input value={estimate.number} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 공급자 + 수신자 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">공급자 (스냅샷)</p>
            <p className="text-xs text-muted-foreground">
              발행 시점 정보. 공급자 설정 변경 후에도 이 견적서엔 영향 없음.
            </p>
            <Field label="회사명">
              <Input
                value={supplier.companyName}
                onChange={(e) => patchSupplier('companyName', e.target.value)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="사업자번호">
                <Input
                  value={supplier.businessNo ?? ''}
                  onChange={(e) =>
                    patchSupplier('businessNo', e.target.value || null)
                  }
                />
              </Field>
              <Field label="대표자">
                <Input
                  value={supplier.ceo ?? ''}
                  onChange={(e) => patchSupplier('ceo', e.target.value || null)}
                />
              </Field>
            </div>
            <Field label="주소">
              <Input
                value={supplier.address ?? ''}
                onChange={(e) =>
                  patchSupplier('address', e.target.value || null)
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="전화">
                <Input
                  value={supplier.phone ?? ''}
                  onChange={(e) =>
                    patchSupplier('phone', e.target.value || null)
                  }
                  placeholder="02-1234-5678"
                />
              </Field>
              <Field label="이메일">
                <Input
                  value={supplier.email ?? ''}
                  onChange={(e) =>
                    patchSupplier('email', e.target.value || null)
                  }
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="담당자">
                <Input
                  value={supplier.contactName ?? ''}
                  onChange={(e) =>
                    patchSupplier('contactName', e.target.value || null)
                  }
                />
              </Field>
              <Field label="담당자 연락처">
                <Input
                  value={supplier.contactPhone ?? ''}
                  onChange={(e) =>
                    patchSupplier('contactPhone', e.target.value || null)
                  }
                  placeholder="010-1234-5678"
                />
              </Field>
            </div>
            <Field label="워터마크 텍스트">
              <Input
                value={supplier.watermarkText ?? ''}
                onChange={(e) =>
                  patchSupplier('watermarkText', e.target.value || null)
                }
                placeholder="예: LAAF, DRAFT (비우면 LAAF)"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                인쇄 미리보기 화면에만 표시됩니다. 인쇄/PDF 저장 시 자동으로
                사라집니다.
              </p>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">수신자</p>
            <Field label="회사명">
              <Input
                value={recipient.companyName}
                onChange={(e) => patchRecipient('companyName', e.target.value)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="담당자">
                <Input
                  value={recipient.contactName ?? ''}
                  onChange={(e) =>
                    patchRecipient('contactName', e.target.value || null)
                  }
                />
              </Field>
              <Field label="연락처">
                <Input
                  value={recipient.phone ?? ''}
                  onChange={(e) =>
                    patchRecipient('phone', e.target.value || null)
                  }
                  placeholder="010-1234-5678"
                />
              </Field>
            </div>
            <Field label="주소">
              <Input
                value={recipient.address ?? ''}
                onChange={(e) =>
                  patchRecipient('address', e.target.value || null)
                }
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* 라인 아이템 */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">항목</p>
            <Button type="button" size="sm" variant="outline" onClick={addItem}>
              <Plus className="mr-1 h-3 w-3" />
              항목 추가
            </Button>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">품명</th>
                  <th className="w-[140px] px-2 py-2 text-left font-medium">
                    규격
                  </th>
                  <th className="w-[80px] px-2 py-2 text-right font-medium">
                    수량
                  </th>
                  <th className="w-[120px] px-2 py-2 text-right font-medium">
                    단가
                  </th>
                  <th className="w-[140px] px-2 py-2 text-right font-medium">
                    공급가액
                  </th>
                  <th className="w-[40px]" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-2 py-1.5">
                      <Input
                        value={item.label}
                        onChange={(e) =>
                          patchItem(item.id, { label: e.target.value })
                        }
                        placeholder="품명"
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={item.spec ?? ''}
                        onChange={(e) =>
                          patchItem(item.id, { spec: e.target.value || null })
                        }
                        placeholder="규격"
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        value={item.qty}
                        onChange={(e) =>
                          patchItem(item.id, {
                            qty: Number(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-right text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          patchItem(item.id, {
                            unitPrice: Number(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-right text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right text-xs font-semibold tabular-nums">
                      {formatKRW(computeLineAmount(item))}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-rose-600"
                        aria-label="항목 삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-sm text-muted-foreground"
                    >
                      항목이 없습니다. "항목 추가"를 눌러 시작하세요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 합계 */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">공급가액</span>
                <span className="tabular-nums">
                  {formatKRW(totals.subtotal)}원
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">부가세 (10%)</span>
                <span className="tabular-nums">{formatKRW(totals.vat)}원</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>합계금액</span>
                <span className="tabular-nums">
                  {formatKRW(totals.total)}원
                </span>
              </div>
              <p className="text-right text-[11px] text-muted-foreground">
                ({numberToKoreanAmount(totals.total)}원)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 비고 */}
      <Card>
        <CardContent className="space-y-1 p-4">
          <Label>비고</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="특이사항, 결제 조건, 보증 등"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
