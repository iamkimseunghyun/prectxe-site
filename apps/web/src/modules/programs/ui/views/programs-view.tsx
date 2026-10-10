import { Suspense } from 'react';
import { JustifiedGrid } from '@/components/image/justified-grid';
import { FilterChip } from '@/components/shared/filter-chip';
import {
  isProgramType,
  PROGRAM_TYPE_LABEL,
  PROGRAM_TYPES,
  type ProgramTypeValue,
} from '@/modules/programs/constants';
import {
  type ArchiveItem,
  getArchiveItems,
} from '@/modules/programs/server/queries';
import { ArchiveTile } from '@/modules/programs/ui/components/archive-tile';

/** 데이터에 실제로 있는 유형만 칩으로 보여 준다(빈 결과로 가는 칩을 만들지 않는다). */
async function ArchiveFilters({ active }: { active?: ProgramTypeValue }) {
  const items = await getArchiveItems();
  const present = PROGRAM_TYPES.filter((t) => items.some((i) => i.type === t));
  if (present.length < 2) return null;

  return (
    <nav aria-label="프로그램 유형" className="mb-12 flex flex-wrap gap-2">
      <FilterChip href="/programs" active={!active}>
        전체
      </FilterChip>
      {present.map((t) => (
        <FilterChip key={t} href={`/programs?type=${t}`} active={active === t}>
          {PROGRAM_TYPE_LABEL[t]}
        </FilterChip>
      ))}
    </nav>
  );
}

/** 조회를 async 자식으로 분리해 Suspense가 실제로 스트리밍하도록 한다. */
async function ArchiveSections({ type }: { type?: ProgramTypeValue }) {
  const all = await getArchiveItems();
  const items = type ? all.filter((i) => i.type === type) : all;

  if (items.length === 0) {
    return (
      <div className="border-t border-neutral-200 py-24 text-center">
        <p className="text-sm text-neutral-500">표시할 프로그램이 없습니다.</p>
      </div>
    );
  }

  // 이미 startAt 내림차순 — 연도 순서를 유지한 채 묶는다.
  const byYear = new Map<number, ArchiveItem[]>();
  for (const item of items) {
    const list = byYear.get(item.year);
    if (list) list.push(item);
    else byYear.set(item.year, [item]);
  }
  // 첫 화면에 보이는 3장만 LCP 후보로 우선 로드
  const eager = new Set(items.slice(0, 3).map((i) => i.id));

  return (
    <div className="space-y-16">
      {[...byYear].map(([year, list]) => (
        <section key={year} aria-labelledby={`archive-year-${year}`}>
          <h2
            id={`archive-year-${year}`}
            className="mb-6 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400"
          >
            {year}
          </h2>
          <JustifiedGrid>
            {list.map((item) => (
              <ArchiveTile
                key={item.id}
                item={item}
                priority={eager.has(item.id)}
              />
            ))}
          </JustifiedGrid>
        </section>
      ))}
    </div>
  );
}

/** 실제 배치(비율대로 한 줄)와 비슷한 모양이라야 로드 후 레이아웃이 덜 밀린다. */
function ArchiveSkeleton() {
  return (
    <div aria-hidden className="space-y-16">
      <div>
        <div className="mb-6 h-3 w-10 bg-neutral-100" />
        <div className="flex gap-3">
          {[1.5, 1.2, 1.8].map((ratio) => (
            <div
              key={ratio}
              className="bg-neutral-100 motion-safe:animate-pulse"
              style={{
                flexGrow: ratio,
                flexBasis: `${ratio * 180}px`,
                aspectRatio: ratio,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProgramsView({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  const type = isProgramType(params.type) ? params.type : undefined;

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
      <header className="mb-14 md:mb-20">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
          Archive
        </p>
        <h1 className="text-4xl font-light leading-[1.1] tracking-tight text-neutral-900 md:text-6xl">
          아카이브
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-500">
          PRECTXE가 선보인 지난 프로그램의 기록.
        </p>
      </header>

      <Suspense fallback={null}>
        <ArchiveFilters active={type} />
      </Suspense>
      {/* key가 없으면 필터를 바꿀 때 스켈레톤이 다시 안 뜬다 */}
      <Suspense key={type ?? 'all'} fallback={<ArchiveSkeleton />}>
        <ArchiveSections type={type} />
      </Suspense>
    </div>
  );
}
