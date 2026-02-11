'use client';

import {
  ArrowLeft,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SubmissionsViewProps {
  data: {
    form: {
      title: string;
      fields: Array<{
        id: string;
        label: string;
        type: string;
        order: number;
        archived: boolean;
      }>;
    };
    submissions: Array<{
      id: string;
      submittedAt: Date;
      ipAddress: string | null;
      userAgent: string | null;
      responses: Array<{
        id: string;
        fieldId: string | null;
        fieldLabel: string | null;
        fieldType: string | null;
        value: string;
        field: {
          id: string;
          label: string;
          type: string;
          archived: boolean;
        } | null;
      }>;
    }>;
  };
}

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

export function SubmissionsView({ data }: SubmissionsViewProps) {
  const { form, submissions } = data;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedSubmission, setSelectedSubmission] = useState<
    (typeof submissions)[0] | null
  >(null);

  // Build complete field list (current + deleted)
  const allFields = useMemo(() => {
    const fieldMap = new Map<
      string,
      { id: string | null; label: string; isDeleted: boolean; index: number }
    >();

    // Add current (non-archived) fields
    form.fields.forEach((field) => {
      fieldMap.set(field.id, {
        id: field.id,
        label: field.label,
        isDeleted: field.archived,
        index: 0,
      });
    });

    // Add deleted/archived fields from responses
    // Track per-submission field order to detect duplicate labels
    submissions.forEach((submission) => {
      const deletedLabelCounts = new Map<string, number>();
      submission.responses.forEach((response) => {
        // Archived fields: fieldId still exists, field.archived === true
        if (response.field?.archived && !fieldMap.has(response.field.id)) {
          fieldMap.set(response.field.id, {
            id: response.field.id,
            label: response.field.label,
            isDeleted: true,
            index: 0,
          });
        }
        // Legacy deleted fields: fieldId is null (과거 데이터 호환)
        else if (!response.fieldId && response.fieldLabel) {
          const count = deletedLabelCounts.get(response.fieldLabel) || 0;
          deletedLabelCounts.set(response.fieldLabel, count + 1);
          const key = `deleted_${response.fieldLabel}_${count}`;
          if (!fieldMap.has(key)) {
            fieldMap.set(key, {
              id: null,
              label: response.fieldLabel,
              isDeleted: true,
              index: count,
            });
          }
        } else if (response.field && !fieldMap.has(response.field.id)) {
          fieldMap.set(response.field.id, {
            id: response.field.id,
            label: response.field.label,
            isDeleted: false,
            index: 0,
          });
        }
      });
    });

    return Array.from(fieldMap.values());
  }, [form.fields, submissions]);

  // Build unique column names for each field
  const fieldColumnNames = useMemo(() => {
    const names = new Map<(typeof allFields)[number], string>();
    const labelCounts = new Map<string, number>();

    // Count how many times each label appears
    for (const field of allFields) {
      const baseLabel = field.isDeleted
        ? `${field.label} (삭제됨)`
        : field.label;
      labelCounts.set(baseLabel, (labelCounts.get(baseLabel) || 0) + 1);
    }

    // Assign unique column names with suffix for duplicates
    const labelIndexes = new Map<string, number>();
    for (const field of allFields) {
      const baseLabel = field.isDeleted
        ? `${field.label} (삭제됨)`
        : field.label;
      const count = labelCounts.get(baseLabel) || 1;
      if (count > 1) {
        const idx = (labelIndexes.get(baseLabel) || 0) + 1;
        labelIndexes.set(baseLabel, idx);
        names.set(field, idx === 1 ? baseLabel : `${baseLabel} (${idx})`);
      } else {
        names.set(field, baseLabel);
      }
    }

    return names;
  }, [allFields]);

  // Transform data for table display
  const tableData = useMemo(() => {
    return submissions.map((submission) => {
      const row: Record<string, string> = {
        id: submission.id,
        제출시간: new Date(submission.submittedAt).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      allFields.forEach((field) => {
        let response:
          | SubmissionsViewProps['data']['submissions'][0]['responses'][0]
          | undefined;
        if (field.id) {
          response = submission.responses.find((r) => r.fieldId === field.id);
        } else {
          // For deleted fields with duplicate labels, match by
          // occurrence index within the submission's responses
          const deletedResponses = submission.responses.filter(
            (r) => !r.fieldId && r.fieldLabel === field.label
          );
          response = deletedResponses[field.index];
        }

        const columnName = fieldColumnNames.get(field) || field.label;
        row[columnName] = response?.value || '-';
      });

      row.IP = submission.ipAddress || '-';

      return row;
    });
  }, [submissions, allFields, fieldColumnNames]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return tableData;

    return tableData.filter((row) =>
      Object.values(row).some((value) =>
        value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [tableData, searchQuery]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Handlers
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc'
          ? { key, direction: 'desc' }
          : { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleExportExcel = () => {
    const exportData = tableData.map((row) => {
      const { id, ...rest } = row;
      return rest;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '응답');

    const maxWidth = 50;
    const wscols = Object.keys(exportData[0] || {}).map(() => ({
      wch: maxWidth,
    }));
    worksheet['!cols'] = wscols;

    XLSX.writeFile(
      workbook,
      `${form.title}_응답_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const handleExportCSV = () => {
    const exportData = tableData.map((row) => {
      const { id, ...rest } = row;
      return rest;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([`\uFEFF${csv}`], {
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
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/forms">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">{form.title}</h1>
              <p className="text-sm text-muted-foreground">응답 현황</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button onClick={handleExportExcel} size="sm">
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>

        {/* Stats & Search */}
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="secondary" className="h-8 px-3">
            총 {submissions.length}개 응답
          </Badge>
          {searchQuery && (
            <Badge variant="outline" className="h-8 px-3">
              검색 결과: {filteredData.length}개
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="응답 내용 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {sortedData.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? '검색 결과가 없습니다' : '아직 응답이 없습니다'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead
                      className="w-44 cursor-pointer select-none hover:bg-muted/80"
                      onClick={() => handleSort('제출시간')}
                    >
                      <div className="flex items-center gap-1">
                        제출시간
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </div>
                    </TableHead>
                    {allFields.map((field, index) => {
                      const columnName =
                        fieldColumnNames.get(field) || field.label;
                      return (
                        <TableHead
                          key={field.id || `deleted_${index}`}
                          className="cursor-pointer select-none hover:bg-muted/80"
                          onClick={() => handleSort(columnName)}
                        >
                          <div className="flex items-center gap-1">
                            {columnName.replace(' (삭제됨)', '')}
                            {field.isDeleted && (
                              <Badge
                                variant="destructive"
                                className="h-5 text-[10px]"
                              >
                                삭제됨
                              </Badge>
                            )}
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </div>
                        </TableHead>
                      );
                    })}
                    <TableHead
                      className="w-32 cursor-pointer select-none hover:bg-muted/80"
                      onClick={() => handleSort('IP')}
                    >
                      <div className="flex items-center gap-1">
                        IP
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </div>
                    </TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row, rowIndex) => {
                    const submission = submissions.find((s) => s.id === row.id);
                    const globalIndex =
                      (currentPage - 1) * pageSize + rowIndex + 1;

                    return (
                      <TableRow
                        key={row.id}
                        className="group hover:bg-muted/50"
                      >
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {globalIndex}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {row.제출시간}
                        </TableCell>
                        {allFields.map((field, index) => {
                          const columnName =
                            fieldColumnNames.get(field) || field.label;
                          const value = row[columnName];
                          return (
                            <TableCell
                              key={field.id || `deleted_${index}`}
                              className="max-w-md text-sm"
                            >
                              {value === '-' ? (
                                <span className="text-muted-foreground">-</span>
                              ) : (
                                <div className="truncate" title={value}>
                                  {value}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-sm">
                          {row.IP === '-' ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            row.IP
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => setSelectedSubmission(submission!)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">페이지당 행 수</p>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {totalPages > 0
                  ? `${currentPage} / ${totalPages} 페이지`
                  : '0 / 0 페이지'}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      <Dialog
        open={!!selectedSubmission}
        onOpenChange={() => setSelectedSubmission(null)}
      >
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>응답 상세</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">제출 시간</p>
                    <p className="font-medium">
                      {new Date(selectedSubmission.submittedAt).toLocaleString(
                        'ko-KR'
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">IP 주소</p>
                    <p className="font-medium">
                      {selectedSubmission.ipAddress || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {selectedSubmission.responses.map((response) => {
                  const fieldLabel =
                    response.fieldLabel ||
                    response.field?.label ||
                    '알 수 없는 필드';
                  const isDeleted =
                    response.field?.archived ||
                    (!response.fieldId && response.fieldLabel);

                  return (
                    <div
                      key={response.id}
                      className="rounded-lg border bg-card p-4"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <p className="font-medium">{fieldLabel}</p>
                        {isDeleted && (
                          <Badge variant="destructive" className="h-5 text-xs">
                            삭제됨
                          </Badge>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {response.value || '-'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
