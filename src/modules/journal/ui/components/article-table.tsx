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
import { Badge } from '@/components/ui/badge';
import { DeleteButton } from '@/components/admin/delete-button';

type Article = {
  slug: string;
  title: string;
  tags: string[];
  publishedAt: Date | string | null;
};

interface ArticleTableProps {
  data: Article[];
}

export function ArticleTable({ data }: ArticleTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="max-w-[200px]">제목</TableHead>
              <TableHead style={{ width: '10rem' }}>발행일</TableHead>
              <TableHead style={{ width: '12rem' }}>태그</TableHead>
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
                  등록된 글이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.slug}>
                  <TableCell className="max-w-[200px] truncate">
                    {item.title}
                  </TableCell>
                  <TableCell>
                    {item.publishedAt
                      ? new Date(item.publishedAt).toLocaleDateString('ko-KR')
                      : '미발행'}
                  </TableCell>
                  <TableCell>
                    {item.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{item.tags.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/journal/${item.slug}/edit`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        편집
                      </Link>
                      <DeleteButton resource="journal" id={item.slug} />
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
