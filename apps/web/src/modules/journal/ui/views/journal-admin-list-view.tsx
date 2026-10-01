import { AdminHeader } from '@/components/admin/admin-header';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { listArticlesPaged } from '@/modules/journal/server/actions';
import { ArticleTable } from '../components/article-table';

interface JournalAdminListViewProps {
  page: number;
}

export async function JournalAdminListView({
  page,
}: JournalAdminListViewProps) {
  const { items, total, pageSize } = await listArticlesPaged({
    page,
    pageSize: 10,
    includeUnpublished: true,
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <AdminHeader
        title="Journal"
        description="저널 글을 작성하고 관리합니다."
        actionLabel="새 글"
        actionHref="/admin/journal/new"
      />
      <ArticleTable data={items} />
      <AdminPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
      />
    </div>
  );
}
