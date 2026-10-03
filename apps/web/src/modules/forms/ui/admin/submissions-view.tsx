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
import {
  buildColumns,
  buildRows,
  formatResponseValue,
} from '@/lib/forms/submissions-table';
import { formatKstDateTime } from '@/lib/utils';

interface SubmissionsViewProps {
  /** 내보내기 라우트 주소를 만드는 데 쓴다 */
  formId: string;
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

export function SubmissionsView({ formId, data }: SubmissionsViewProps) {
  const { form, submissions } = data;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedSubmission, setSelectedSubmission] = useState<
    (typeof submissions)[0] | null
  >(null);

  // 컬럼 그룹핑·행 변환은 내보내기 라우트와 같은 규칙을 써야 해서
  // lib/forms/submissions-table에 있다.
  const columns = useMemo(
    () => buildColumns(form.fields, submissions),
    [form.fields, submissions]
  );

  const tableData = useMemo(
    () => buildRows(submissions, columns),
    [submissions, columns]
  );

  // Filter data
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return tableData;

    const q = searchQuery.toLowerCase();
    // row.id는 화면에 없는 내부 cuid다. 검색 대상에 넣으면 'a' 같은 짧은
    // 질의가 엉뚱한 행을 잔뜩 물어온다.
    return tableData.filter(({ id: _id, ...visible }) =>
      Object.values(visible).some((value) => value.toLowerCase().includes(q))
    );
  }, [tableData, searchQuery]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    // 제출시간 칸에 들어있는 값은 '2026년 9월 2일 (화) 오후 3:03' 같은 표시용
    // 문자열이다. 문자열로 비교하면 '9월' > '10월'이라 9월이 10월 뒤로 가고
    // 오전/오후도 뒤섞이므로, 정렬만은 원본 timestamp로 한다.
    const submittedAtById = new Map(
      submissions.map((s) => [s.id, new Date(s.submittedAt).getTime()])
    );

    return [...filteredData].sort((a, b) => {
      if (sortConfig.key === '제출시간') {
        const diff =
          (submittedAtById.get(a.id) ?? 0) - (submittedAtById.get(b.id) ?? 0);
        return sortConfig.direction === 'asc' ? diff : -diff;
      }

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig, submissions]);

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

  // 내보내기는 서버 라우트가 만든다. 브라우저에서 스프레드시트를 만들던
  // 예전 방식은 CSV 수식 인젝션 방어가 없었고(폼 응답은 외부인이 채운다),
  // 취약점이 남은 xlsx 패키지를 클라이언트로 끌고 왔다.
  const exportUrl = (format: 'csv' | 'xlsx') =>
    `/api/admin/forms/${formId}/export?format=${format}`;

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
            <Button asChild variant="outline" size="sm">
              <a href={exportUrl('csv')} download>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </a>
            </Button>
            <Button asChild size="sm">
              <a href={exportUrl('xlsx')} download>
                <Download className="mr-2 h-4 w-4" />
                Excel
              </a>
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
                <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
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
                    {columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className="cursor-pointer select-none hover:bg-muted/80"
                        onClick={() => handleSort(col.key)}
                        title={col.label}
                      >
                        <div className="flex items-center gap-1">
                          {/* 긴 라벨(동의문 등)이 헤더를 세로로 늘리지 않도록
                              2줄로 clamp, 전체 텍스트는 hover 시 title로 표시 */}
                          <span className="line-clamp-2 max-w-[200px] break-words">
                            {col.label}
                          </span>
                          {!col.hasActive && (
                            <Badge
                              variant="destructive"
                              className="h-5 shrink-0 text-[10px]"
                            >
                              삭제됨
                            </Badge>
                          )}
                          <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
                        </div>
                      </TableHead>
                    ))}
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
                        {columns.map((col) => {
                          const value = row[col.key];
                          return (
                            <TableCell
                              key={col.key}
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
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="text-muted-foreground">제출 시간</p>
                <p className="font-medium">
                  {formatKstDateTime(new Date(selectedSubmission.submittedAt))}
                </p>
              </div>

              <div className="space-y-3">
                {selectedSubmission.responses.map((response) => {
                  const fieldLabel =
                    response.fieldLabel ||
                    response.field?.label ||
                    '알 수 없는 필드';
                  // A response is "deleted" only when no active field with the
                  // same label remains — otherwise it's just an older version
                  // of a still-existing question.
                  const isDeleted = !columns.some(
                    (col) => col.hasActive && col.label === fieldLabel
                  );

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
                        {formatResponseValue(response.value) || '-'}
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
