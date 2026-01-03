'use client';

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DeleteButton } from '@/components/admin/delete-button';

type Program = {
  id: string;
  title: string;
  type: string;
  status: string;
  startAt: Date | string;
  city: string | null;
};

interface ProgramTableProps {
  data: Program[];
}

export function ProgramTable({ data }: ProgramTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="max-w-[200px]">제목</TableHead>
              <TableHead style={{ width: '6rem' }}>유형</TableHead>
              <TableHead style={{ width: '5rem' }}>상태</TableHead>
              <TableHead style={{ width: '8rem' }}>일정</TableHead>
              <TableHead style={{ width: '6rem' }}>도시</TableHead>
              <TableHead style={{ width: '8rem' }}>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  등록된 프로그램이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[200px] truncate">
                    {item.title}
                  </TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.status}</TableCell>
                  <TableCell>
                    {new Date(item.startAt).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell>{item.city ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/programs/${item.id}/edit`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        편집
                      </Link>
                      <DeleteButton resource="programs" id={item.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
