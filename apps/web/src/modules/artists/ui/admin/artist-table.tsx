'use client';

import Link from 'next/link';
import { DeleteButton } from '@/components/admin/delete-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatArtistName } from '@/lib/utils';

type Artist = {
  id: string;
  name: string | null;
  nameKr: string | null;
  city: string | null;
  country: string | null;
};

interface ArtistTableProps {
  data: Artist[];
}

export function ArtistTable({ data }: ArtistTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="max-w-[200px]">이름</TableHead>
              <TableHead style={{ width: '10rem' }}>도시</TableHead>
              <TableHead style={{ width: '10rem' }}>국가</TableHead>
              <TableHead style={{ width: '8rem' }}>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  등록된 아티스트가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[200px] truncate">
                    {formatArtistName(item.nameKr, item.name)}
                  </TableCell>
                  <TableCell>{item.city ?? '-'}</TableCell>
                  <TableCell>{item.country ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/artists/${item.id}/edit`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        편집
                      </Link>
                      <DeleteButton resource="artists" id={item.id} />
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
