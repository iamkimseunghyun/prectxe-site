import { listArticles } from '@/modules/journal/server/actions';
import { AdminHeader } from '@/components/admin/admin-header';
import { ArticleTable } from '../components/article-table';

export async function JournalAdminListView() {
  const { data } = await listArticles({ includeUnpublished: true });
  const items = data ?? [];

  return (
    <div>
      <AdminHeader
        title="Journal"
        description="저널 글을 작성하고 관리합니다."
        actionLabel="새 글"
        actionHref="/admin/journal/new"
      />
      <ArticleTable data={items} />
    </div>
  );
}
