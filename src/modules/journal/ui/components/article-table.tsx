'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeleteButton } from '@/components/admin/delete-button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { toggleArticleFeatured } from '@/modules/journal/server/actions';

type Article = {
  slug: string;
  title: string;
  publishedAt: Date | string | null;
  isFeatured: boolean;
};

interface ArticleTableProps {
  data: Article[];
}

export function ArticleTable({ data }: ArticleTableProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleToggleFeatured = async (slug: string) => {
    const res = await toggleArticleFeatured(slug);
    if (res.success) {
      router.refresh();
    } else {
      toast({
        title: '메인 노출 설정 실패',
        description: res.error,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="max-w-[200px]">제목</TableHead>
              <TableHead style={{ width: '10rem' }}>발행일</TableHead>
              <TableHead style={{ width: '5rem' }}>메인</TableHead>
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
                    <Switch
                      checked={item.isFeatured}
                      onCheckedChange={() => handleToggleFeatured(item.slug)}
                    />
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
