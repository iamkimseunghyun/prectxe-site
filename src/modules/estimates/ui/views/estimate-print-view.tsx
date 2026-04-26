'use client';

import { Printer } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  computeEstimateTotals,
  computeLineAmount,
  formatKRW,
  numberToKoreanAmount,
} from '@/lib/estimates/calc';
import type { LineItem, Recipient } from '@/lib/schemas/estimate';
import { getImageUrl } from '@/lib/utils';

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
    issueDate: string;
    validUntil: string | null;
    supplier: SupplierSnapshot;
    recipient: Recipient;
    lineItems: LineItem[];
    notes: string | null;
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
}

export function EstimatePrintView({ estimate }: Props) {
  const totals = computeEstimateTotals(estimate.lineItems);
  const watermark = estimate.supplier.watermarkText?.trim() || 'LAAF';
  const sealSrc = estimate.supplier.sealUrl
    ? getImageUrl(estimate.supplier.sealUrl, 'public')
    : null;

  return (
    <>
      {/* 인쇄 시 견적서 외 모든 요소 숨김 */}
      <style jsx global>{`
        @media print {
          /* 모든 요소 숨김 */
          body * {
            visibility: hidden !important;
          }
          /* 견적서 컨테이너와 그 자손만 보이게 */
          .estimate-print-page,
          .estimate-print-page * {
            visibility: visible !important;
          }
          /* 컨테이너를 페이지 좌상단에 고정 */
          .estimate-print-page {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          /* 워터마크와 툴바는 출력에서 제외 */
          .estimate-watermark {
            display: none !important;
          }
          .estimate-toolbar {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 14mm;
          }
          body {
            background: white !important;
          }
        }
        @media screen {
          body {
            background: #f1f5f9;
          }
        }
      `}</style>

      <div className="estimate-toolbar sticky top-0 z-20 flex items-center justify-between border-b bg-white px-6 py-3 shadow-sm">
        <p className="text-sm text-muted-foreground">
          미리보기 · 인쇄(또는 PDF로 저장) 시 워터마크가 자동으로 사라집니다
        </p>
        <Button type="button" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" />
          인쇄 / PDF
        </Button>
      </div>

      <div className="estimate-print-page mx-auto my-8 max-w-[840px] bg-white p-12 shadow-sm print:my-0 print:max-w-full print:p-0 print:shadow-none">
        <div className="relative">
          {/* 워터마크 */}
          <div
            className="estimate-watermark pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="rotate-[-30deg] select-none text-[160px] font-black tracking-widest text-slate-200/60">
              {watermark}
            </span>
          </div>

          <div className="relative">
            {/* 제목 */}
            <h1 className="mb-8 text-center text-4xl font-bold tracking-wider">
              견 적 서
            </h1>

            {/* 견적번호/일자 */}
            <div className="mb-6 flex justify-between text-sm">
              <div>
                <p>
                  <span className="text-muted-foreground">견적번호</span>{' '}
                  <span className="font-medium">{estimate.number}</span>
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">발행일자</span>{' '}
                  {formatDate(estimate.issueDate)}
                </p>
                {estimate.validUntil && (
                  <p className="mt-1">
                    <span className="text-muted-foreground">유효기간</span>{' '}
                    {formatDate(estimate.validUntil)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">{estimate.title}</p>
              </div>
            </div>

            {/* 수신자 + 공급자 */}
            <div className="mb-6 grid grid-cols-2 gap-6 text-sm">
              {/* 수신자 */}
              <div className="rounded border border-slate-300 p-4">
                <p className="mb-2 text-xs font-semibold text-slate-500">
                  수신
                </p>
                <p className="text-base font-bold">
                  {estimate.recipient.companyName} 귀중
                </p>
                {estimate.recipient.contactName && (
                  <p className="mt-2 text-xs">
                    담당자: {estimate.recipient.contactName}
                  </p>
                )}
                {estimate.recipient.phone && (
                  <p className="text-xs">연락처: {estimate.recipient.phone}</p>
                )}
                {estimate.recipient.address && (
                  <p className="text-xs">{estimate.recipient.address}</p>
                )}
              </div>

              {/* 공급자 */}
              <div className="relative rounded border border-slate-300 p-4">
                <p className="mb-2 text-xs font-semibold text-slate-500">
                  공급자
                </p>
                <p className="text-base font-bold">
                  {estimate.supplier.companyName}
                </p>
                <div className="mt-1 space-y-0.5 text-xs">
                  {estimate.supplier.businessNo && (
                    <p>사업자등록번호: {estimate.supplier.businessNo}</p>
                  )}
                  {estimate.supplier.ceo && (
                    <p>대표자: {estimate.supplier.ceo}</p>
                  )}
                  {estimate.supplier.address && (
                    <p>{estimate.supplier.address}</p>
                  )}
                  {estimate.supplier.phone && (
                    <p>전화: {estimate.supplier.phone}</p>
                  )}
                  {estimate.supplier.email && (
                    <p>이메일: {estimate.supplier.email}</p>
                  )}
                  {estimate.supplier.contactName && (
                    <p>
                      담당: {estimate.supplier.contactName}
                      {estimate.supplier.contactPhone &&
                        ` (${estimate.supplier.contactPhone})`}
                    </p>
                  )}
                </div>
                {/* 인감 */}
                {sealSrc && (
                  <div className="absolute bottom-2 right-2">
                    <Image
                      src={sealSrc}
                      alt="인감"
                      width={70}
                      height={70}
                      className="opacity-90"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 합계 강조 */}
            <div className="mb-4 rounded border border-slate-800 bg-slate-50 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">
                합계금액 (부가세 포함)
              </p>
              <p className="mt-1 text-2xl font-bold tracking-wide">
                일금 {numberToKoreanAmount(totals.total)}원정 (₩
                {formatKRW(totals.total)})
              </p>
            </div>

            {/* 항목 테이블 */}
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y-2 border-slate-800 bg-slate-100">
                  <th className="w-[50px] px-2 py-2 text-center font-semibold">
                    No.
                  </th>
                  <th className="px-2 py-2 text-left font-semibold">품명</th>
                  <th className="w-[110px] px-2 py-2 text-left font-semibold">
                    규격
                  </th>
                  <th className="w-[60px] px-2 py-2 text-right font-semibold">
                    수량
                  </th>
                  <th className="w-[110px] px-2 py-2 text-right font-semibold">
                    단가
                  </th>
                  <th className="w-[130px] px-2 py-2 text-right font-semibold">
                    공급가액
                  </th>
                </tr>
              </thead>
              <tbody>
                {estimate.lineItems.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-300">
                    <td className="px-2 py-2 text-center text-xs text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-2">{item.label}</td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">
                      {item.spec ?? ''}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {item.qty.toLocaleString('ko-KR')}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {formatKRW(item.unitPrice)}
                    </td>
                    <td className="px-2 py-2 text-right font-medium tabular-nums">
                      {formatKRW(computeLineAmount(item))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-y border-slate-800 bg-slate-50">
                  <td
                    colSpan={5}
                    className="px-2 py-2 text-right font-semibold"
                  >
                    공급가액
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">
                    {formatKRW(totals.subtotal)}
                  </td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td
                    colSpan={5}
                    className="px-2 py-2 text-right font-semibold"
                  >
                    부가세 (10%)
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">
                    {formatKRW(totals.vat)}
                  </td>
                </tr>
                <tr className="border-b-2 border-slate-800 bg-slate-100">
                  <td colSpan={5} className="px-2 py-2 text-right font-bold">
                    합계금액
                  </td>
                  <td className="px-2 py-2 text-right font-bold tabular-nums">
                    {formatKRW(totals.total)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* 비고 */}
            {estimate.notes && (
              <div className="mt-6 rounded border border-slate-300 p-4 text-sm">
                <p className="mb-1 text-xs font-semibold text-slate-500">
                  비고
                </p>
                <p className="whitespace-pre-wrap">{estimate.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
