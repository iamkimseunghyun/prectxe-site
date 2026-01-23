'use client';

import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SubmissionsViewProps {
  formId: string;
  data: {
    form: {
      title: string;
      fields: Array<{
        id: string;
        label: string;
        type: string;
        order: number;
      }>;
    };
    submissions: Array<{
      id: string;
      submittedAt: Date;
      ipAddress: string | null;
      userAgent: string | null;
      responses: Array<{
        id: string;
        fieldId: string;
        value: string;
        field: {
          id: string;
          label: string;
          type: string;
        };
      }>;
    }>;
  };
}

export function SubmissionsView({ formId, data }: SubmissionsViewProps) {
  const { form, submissions } = data;

  // Transform data for table display
  const tableData = useMemo(() => {
    return submissions.map((submission) => {
      const row: Record<string, string> = {
        제출시간: new Date(submission.submittedAt).toLocaleString('ko-KR'),
      };

      // Add field responses
      form.fields.forEach((field) => {
        const response = submission.responses.find(
          (r) => r.fieldId === field.id
        );
        row[field.label] = response?.value || '-';
      });

      row.IP = submission.ipAddress || '-';

      return row;
    });
  }, [submissions, form.fields]);

  // Export to Excel
  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '응답');

    // Set column widths
    const maxWidth = 50;
    const wscols = Object.keys(tableData[0] || {}).map(() => ({
      wch: maxWidth,
    }));
    worksheet['!cols'] = wscols;

    XLSX.writeFile(
      workbook,
      `${form.title}_응답_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${form.title}_응답_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/forms">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{form.title} - 응답 현황</h1>
            <p className="text-sm text-neutral-500">
              총 {submissions.length}개의 응답
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            CSV 다운로드
          </Button>
          <Button onClick={handleExportExcel} size="sm">
            <Download className="mr-2 h-4 w-4" />
            Excel 다운로드
          </Button>
        </div>
      </div>

      {/* Table */}
      {submissions.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-neutral-500">아직 응답이 없습니다</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">제출시간</TableHead>
                {form.fields.map((field) => (
                  <TableHead key={field.id}>{field.label}</TableHead>
                ))}
                <TableHead className="w-32">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell className="text-sm">
                    {new Date(submission.submittedAt).toLocaleString('ko-KR')}
                  </TableCell>
                  {form.fields.map((field) => {
                    const response = submission.responses.find(
                      (r) => r.fieldId === field.id
                    );
                    return (
                      <TableCell key={field.id} className="max-w-md text-sm">
                        {response?.value || (
                          <span className="text-neutral-400">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-sm">
                    {submission.ipAddress || (
                      <span className="text-neutral-400">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
