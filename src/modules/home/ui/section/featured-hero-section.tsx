import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { listPrograms } from '@/modules/programs/server/actions';
import { formatEventDate, getImageUrl } from '@/lib/utils';

export async function FeaturedHeroSection() {
  // Archive-first: pick the most recent completed program; fallback to upcoming
  const completed = await listPrograms({ status: 'completed' });
  const upcoming = await listPrograms({ status: 'upcoming' });
  const featured =
    (completed.data ?? [])[0] ?? (upcoming.data ?? [])[0] ?? null;

  const start = featured?.startAt ? new Date(featured.startAt) : null;
  const end = featured?.endAt ? new Date(featured.endAt) : start;
  const when = start && end ? formatEventDate(start, end) : null;
  const where = [featured?.city, featured?.venue].filter(Boolean).join(' · ');
  const hero = featured?.heroUrl
    ? getImageUrl(featured.heroUrl, 'public')
    : '/images/placeholder.png';

  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-neutral-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 md:text-5xl">
              Feed‑first Discovery
            </h1>
            <p className="mt-3 max-w-xl text-base text-neutral-600 md:text-lg">
              가장 가까운 프로그램을 먼저. 전시, 라이브, 파티를 빠르게
              확인하세요.
            </p>

            {featured ? (
              <div className="mt-4 space-y-1 text-sm text-neutral-600">
                <p className="font-medium">{featured.title}</p>
                {(when || where) && (
                  <p className="text-neutral-500">
                    {[when, where].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/programs?status=completed">
                <Button size="lg">아카이브 보기</Button>
              </Link>
              <Link
                href="/journal"
                className="text-sm text-neutral-600 underline hover:text-neutral-900"
              >
                최근 소식
              </Link>
            </div>
            <p className="mt-3 text-xs text-neutral-500">⌘K / Ctrl+K 로 검색</p>
          </div>

          <div className="relative hidden aspect-[16/10] overflow-hidden rounded-2xl border bg-neutral-100 sm:block">
            <Image
              src={hero}
              alt={featured ? featured.title : 'PRECTXE hero visual'}
              fill
              priority
              sizes="(min-width: 1024px) 600px, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
