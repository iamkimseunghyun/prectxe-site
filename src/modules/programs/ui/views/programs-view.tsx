import { Suspense } from 'react';
import EntityGridSkeleton from '@/components/layout/skeleton/entity-grid-skeleton';
import { listProgramsPaged } from '@/modules/programs/server/actions';
import { ProgramGridInfinite } from '@/modules/programs/ui/components/program-grid-infinite';

/** 조회를 async 자식으로 분리해 Suspense가 실제로 스트리밍하도록 한다. */
async function ProgramResults({ page }: { page: number }) {
  // Program은 아카이브 전용 — 지난 프로그램 단일 목록 (최근 이벤트 먼저)
  const archive = await listProgramsPaged({
    status: 'completed',
    page,
    pageSize: 12,
  });

  if (archive.items.length === 0) {
    return (
      <div className="border-t border-neutral-200 py-24 text-center">
        <p className="text-sm text-neutral-500">표시할 프로그램이 없습니다.</p>
      </div>
    );
  }

  return (
    <ProgramGridInfinite
      initialItems={archive.items}
      query={{ status: 'completed' }}
    />
  );
}

export function ProgramsView({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  const page = params.page ? parseInt(params.page, 10) : 1;

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
      <header className="mb-14 md:mb-20">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
          Archive
        </p>
        <h1 className="text-4xl font-light leading-[1.1] tracking-tight text-neutral-900 md:text-6xl">
          프로그램
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-500">
          PRECTXE가 선보인 지난 프로그램의 아카이브.
        </p>
      </header>

      <Suspense fallback={<EntityGridSkeleton />}>
        <ProgramResults page={page} />
      </Suspense>
    </div>
  );
}
