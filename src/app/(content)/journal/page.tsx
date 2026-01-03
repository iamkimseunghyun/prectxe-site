import { JournalListView } from '@/modules/journal/ui/views/journal-list-view';

const Page = async () => {
  return <JournalListView />;
};

export default Page;

export const metadata = {
  title: 'Journal — PRECTXE',
  description: '에디토리얼, 노트, 인터뷰',
};
