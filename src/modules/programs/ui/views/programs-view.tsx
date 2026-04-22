import { listProgramsPaged } from '@/modules/programs/server/actions';
import { ProgramGridInfinite } from '@/modules/programs/ui/components/program-grid-infinite';

export async function ProgramsView({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  const page = params.page ? parseInt(params.page, 10) : 1;

  // 공개 페이지 — Upcoming(다가올)과 Archive(지난) 분리 구성
  const [upcoming, archive] = await Promise.all([
    listProgramsPaged({ status: 'upcoming', page: 1, pageSize: 24 }),
    listProgramsPaged({ status: 'completed', page, pageSize: 12 }),
  ]);

  const hasUpcoming = upcoming.items.length > 0;
  const hasArchive = archive.items.length > 0;
  const isEmpty = !hasUpcoming && !hasArchive;

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
      <header className="mb-14 md:mb-20">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
          Programs
        </p>
        <h1 className="text-4xl font-light leading-[1.1] tracking-tight text-neutral-900 md:text-6xl">
          프로그램
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-500">
          다가오는 이벤트와 지난 프로그램의 아카이브.
        </p>
      </header>

      {isEmpty && (
        <div className="border-t border-neutral-200 py-24 text-center">
          <p className="text-sm text-neutral-500">
            표시할 프로그램이 없습니다.
          </p>
        </div>
      )}

      {hasUpcoming && (
        <section className="mb-24 md:mb-32">
          <h2 className="mb-8 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-400 md:mb-10">
            Upcoming
          </h2>
          <ProgramGridInfinite
            initialItems={upcoming.items as any}
            query={{ status: 'upcoming' }}
          />
        </section>
      )}

      {hasArchive && (
        <section>
          <h2 className="mb-8 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-400 md:mb-10">
            Archive
          </h2>
          <ProgramGridInfinite
            initialItems={archive.items as any}
            query={{ status: 'completed' }}
          />
        </section>
      )}
    </div>
  );
}
