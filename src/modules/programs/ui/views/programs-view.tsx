import Link from 'next/link';
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
    <>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="mb-8 text-3xl font-bold">Archive</h1>

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

      <div className="flex items-center justify-center gap-4 py-6 text-xs sm:gap-6 sm:py-8 sm:text-sm md:text-base">
        <Link
          href="/"
          className="text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Home
        </Link>
        <Link
          href="/programs"
          className="text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Archive
        </Link>
        <Link
          href="/journal"
          className="text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Journal
        </Link>
        <Link
          href="/about"
          className="text-neutral-500 transition-colors hover:text-neutral-900"
        >
          About
        </Link>
      </div>
    </>
  );
}
