import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProgramSchema from '@/components/seo/program-schema';
import { BackButton } from '@/components/shared/back-button';
import { CopyUrlButton } from '@/components/shared/copy-url-button';
import { ExpandableText } from '@/components/shared/expandable-text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  artistInitials,
  formatArtistName,
  formatKstDate,
  formatKstDateRange,
  getImageUrl,
} from '@/lib/utils';
import { listArticlesByProgram } from '@/modules/journal/server/actions';
import {
  isProgramType,
  kstYear,
  PROGRAM_TYPE_LABEL,
} from '@/modules/programs/constants';
import { getProgramBySlug } from '@/modules/programs/server/actions';
import ProgramGallery from '@/modules/programs/ui/components/program-gallery';

// 대표 이미지는 가로로 넓게 — 세로 사진이 화면을 다 차지하지 않도록 비율을 제한한다.
const HERO_MIN_RATIO = 1.5;
const HERO_MAX_RATIO = 2.4;
const HERO_FALLBACK_RATIO = 16 / 9;

export async function ProgramDetailView({ slug }: { slug: string }) {
  const program = await getProgramBySlug(slug);

  // 소프트 404(200 + 안내 div)는 검색엔진이 정상 페이지로 색인한다.
  // notFound()로 실제 404 상태와 공용 not-found UI를 반환한다.
  if (!program) notFound();

  const start = program.startAt ? new Date(program.startAt) : null;
  const end = program.endAt ? new Date(program.endAt) : (start ?? undefined);

  const kicker = [
    isProgramType(program.type) ? PROGRAM_TYPE_LABEL[program.type] : null,
    program.startAt ? kstYear(program.startAt) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const heroRatio =
    program.heroWidth && program.heroHeight
      ? Math.min(
          HERO_MAX_RATIO,
          Math.max(HERO_MIN_RATIO, program.heroWidth / program.heroHeight)
        )
      : HERO_FALLBACK_RATIO;

  return (
    <article className="relative mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
      <BackButton fallbackHref="/programs" />
      <ProgramSchema
        program={{
          title: program.title,
          summary: program.summary,
          description: program.description ?? undefined,
          type: program.type,
          startAt: program.startAt ?? null,
          endAt: program.endAt ?? null,
          city: program.city ?? null,
          venue: program.venue ?? null,
          heroUrl: program.heroUrl ?? null,
          slug: program.slug,
        }}
      />

      <header className="mb-8 mt-6 md:mb-10">
        {kicker && (
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
            {kicker}
          </p>
        )}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-light leading-tight tracking-tight text-neutral-900 sm:text-5xl">
            {program.title}
          </h1>
          <CopyUrlButton className="mt-2 shrink-0 text-neutral-400 transition-colors hover:text-neutral-600" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
          {start && end && <span>{formatKstDateRange(start, end)}</span>}
          {(program.city || program.venue) && (
            <span>
              {[program.city, program.venue].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      </header>

      <div className="mb-16 space-y-3">
        {program.heroUrl && (
          <div
            className="relative w-full overflow-hidden bg-neutral-100"
            style={{ aspectRatio: heroRatio }}
          >
            <Image
              src={getImageUrl(program.heroUrl, 'public')}
              alt={program.title}
              fill
              priority
              sizes="(min-width: 1152px) 1072px, 100vw"
              className="object-cover"
            />
          </div>
        )}

        {program.images?.length ? (
          <section aria-label="갤러리">
            <ProgramGallery
              title={program.title}
              images={program.images.map((i) => ({
                id: i.id,
                imageUrl: i.imageUrl,
                width: i.width,
                height: i.height,
                caption: i.caption,
              }))}
            />
          </section>
        ) : null}
      </div>

      <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_16rem] md:gap-16">
        <div>
          {program.description && (
            <section aria-labelledby="program-about" className="mb-12">
              <h2
                id="program-about"
                className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400"
              >
                소개
              </h2>
              <ExpandableText text={program.description} />
            </section>
          )}
          <RelatedArticles programId={program.id} />
        </div>

        {program.credits?.length ? (
          <aside aria-labelledby="program-credits">
            <h2
              id="program-credits"
              className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400"
            >
              크레딧
            </h2>
            <ul className="space-y-3">
              {program.credits.map((c) => {
                const kr = c.artist?.nameKr || null;
                const en = c.artist?.name || null;
                const name = formatArtistName(kr, en);
                const img = c.artist?.mainImageUrl || undefined;
                const initials = artistInitials(
                  en || undefined,
                  kr || undefined
                );
                return (
                  <li key={`${c.programId}-${c.artistId}`}>
                    <Link
                      href={`/artists/${c.artistId}`}
                      className="flex items-center gap-3 text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                    >
                      <Avatar className="h-9 w-9">
                        {img ? (
                          <AvatarImage
                            src={getImageUrl(img, 'thumbnail')}
                            alt={name}
                          />
                        ) : (
                          <AvatarFallback className="text-xs">
                            {initials}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate">{name}</span>
                        {c.role && (
                          <span className="block truncate text-xs text-neutral-400">
                            {c.role}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>
        ) : null}
      </div>
    </article>
  );
}

async function RelatedArticles({ programId }: { programId: string }) {
  const articles = await listArticlesByProgram(programId);
  if (!articles.length) return null;

  return (
    <section aria-labelledby="program-journal">
      <h2
        id="program-journal"
        className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400"
      >
        저널에서 읽기
      </h2>
      <ul className="space-y-2">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/journal/${a.slug}`}
              className="text-neutral-700 underline-offset-4 transition-colors hover:text-neutral-900 hover:underline"
            >
              {a.title}
            </Link>
            {a.publishedAt && (
              <span className="ml-2 text-sm text-neutral-400">
                {formatKstDate(new Date(a.publishedAt))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
