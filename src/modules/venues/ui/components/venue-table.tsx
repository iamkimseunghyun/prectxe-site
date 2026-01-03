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

type Venue = {
  id: string;
  name: string;
  address: string | null;
};

interface VenueTableProps {
  data: Venue[];
}

export function VenueTable({ data }: VenueTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="max-w-[200px]">이름</TableHead>
              <TableHead style={{ width: '16rem' }}>주소</TableHead>
              <TableHead style={{ width: '8rem' }}>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-8 text-center text-muted-foreground"
                >
                  등록된 장소가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[200px] truncate">
                    {item.name}
                  </TableCell>
                  <TableCell className="truncate">
                    {item.address ?? '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/venues/${item.id}/edit`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        편집
                      </Link>
                      <DeleteButton resource="venues" id={item.id} />
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
