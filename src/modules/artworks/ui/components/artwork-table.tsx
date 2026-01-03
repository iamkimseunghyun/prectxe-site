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

type Artwork = {
  id: string;
  title: string;
  year: number | null;
  media: string | null;
  artists: Array<{
    artist: {
      name: string | null;
    };
  }>;
};

interface ArtworkTableProps {
  data: Artwork[];
}

export function ArtworkTable({ data }: ArtworkTableProps) {
  const formatArtists = (artists: Artwork['artists']) =>
    artists.length > 0
      ? artists.map((a) => a.artist.name || '-').join(', ')
      : '-';

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="max-w-[200px]">제목</TableHead>
              <TableHead style={{ width: '6rem' }}>연도</TableHead>
              <TableHead style={{ width: '12rem' }}>매체</TableHead>
              <TableHead style={{ width: '12rem' }}>아티스트</TableHead>
              <TableHead style={{ width: '8rem' }}>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  등록된 작품이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[200px] truncate">
                    {item.title}
                  </TableCell>
                  <TableCell>{item.year ?? '-'}</TableCell>
                  <TableCell className="truncate">
                    {item.media ?? '-'}
                  </TableCell>
                  <TableCell>{formatArtists(item.artists)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/artworks/${item.id}/edit`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        편집
                      </Link>
                      <DeleteButton resource="artworks" id={item.id} />
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
