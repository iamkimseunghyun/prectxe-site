import Image from 'next/image';
import Link from 'next/link';
import { formatEventDate, getImageUrl } from '@/lib/utils';
import { listPrograms } from '@/modules/programs/server/actions';

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
    <section className="min-h-screen">
      {featured ? (
        <Link href={`/programs/${featured.slug}`} className="block h-full">
          <div className="relative h-[70vh] w-full">
            <Image
              src={hero}
              alt={featured.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:p-12">
              <h1 className="text-3xl font-bold md:text-5xl">
                {featured.title}
              </h1>
              {(when || where) && (
                <p className="mt-2 text-sm text-white/80 md:text-base">
                  {[when, where].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
        </Link>
      ) : (
        <div className="flex h-[70vh] items-center justify-center">
          <p className="text-neutral-400">프로그램이 없습니다</p>
        </div>
      )}

      <div className="flex items-center justify-center gap-6 py-8">
        <Link
          href="/programs"
          className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Archive
        </Link>
        <Link
          href="/journal"
          className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Journal
        </Link>
        <Link
          href="/about"
          className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          About
        </Link>
      </div>
    </section>
  );
}
