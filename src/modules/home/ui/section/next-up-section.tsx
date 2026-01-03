import Link from 'next/link';
import { listPrograms } from '@/modules/programs/server/actions';
import { ProgramCard } from '@/modules/programs/ui/section/program-card';

export async function NextUpSection() {
  const { data } = await listPrograms({ status: 'upcoming' });
  const items = (data ?? []).slice(0, 6);

  return (
    <section className="px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Next Up</h2>
            <p className="text-sm text-muted-foreground">
              다가오는 프로그램을 미리 만나보세요.
            </p>
          </div>
          <Link
            href="/discover"
            className="rounded text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            모두 보기
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
            준비 중입니다. 곧 새로운 소식을 전할게요.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Link key={p.slug} href={`/programs/${p.slug}`}>
                <ProgramCard
                  program={{
                    slug: p.slug,
                    title: p.title,
                    summary: p.summary,
                    heroUrl: p.heroUrl ?? undefined,
                    status: p.status as any,
                    type: p.type as any,
                    startAt: p.startAt,
                    endAt: p.endAt ?? undefined,
                    city: p.city ?? undefined,
                    venue: p.venue ?? undefined,
                  }}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
