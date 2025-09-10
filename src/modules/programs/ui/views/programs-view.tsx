import { listProgramsPaged } from '@/modules/programs/server/actions';
import { ProgramGridInfinite } from '@/modules/programs/ui/components/program-grid-infinite';

export async function ProgramsView({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  const page = params.page ? parseInt(params.page, 10) : 1;

  // Archive-first: prefer completed; if empty, fallback to upcoming
  const completed = await listProgramsPaged({
    status: 'completed',
    page,
    pageSize: 12,
  });
  const usingCompleted = !!(completed.items && completed.items.length > 0);
  const data = usingCompleted
    ? completed
    : await listProgramsPaged({ status: 'upcoming', page, pageSize: 12 });
  const items = data.items;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">Archive</h1>
        <p className="text-muted-foreground">
          {usingCompleted
            ? '완료된 프로그램(아카이브)을 보여줍니다.'
            : '아카이브가 비어 있어 예정된 프로그램을 대신 보여줍니다.'}
        </p>
      </div>
      {/* 필터 UI 제거: 상태/도시/유형 등은 전역 검색(⌘K / Ctrl+K)을 사용하세요. */}

      {(!items || items.length === 0) && (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
          표시할 프로그램이 없습니다.
        </div>
      )}

      <ProgramGridInfinite
        initialItems={items as any}
        query={{ status: usingCompleted ? 'completed' : 'upcoming' }}
      />
    </div>
  );
}
