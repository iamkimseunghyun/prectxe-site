import Image from 'next/image';
import Link from 'next/link';
import ProgramSchema from '@/components/seo/program-schema';
import { BackButton } from '@/components/shared/back-button';
import { CopyUrlButton } from '@/components/shared/copy-url-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  artistInitials,
  formatArtistName,
  formatEventDate,
  getImageUrl,
} from '@/lib/utils';
import { getProgramBySlug } from '@/modules/programs/server/actions';
import ProgramGallery from '@/modules/programs/ui/section/program-gallery';

export async function ProgramDetailView({ slug }: { slug: string }) {
  const program = await getProgramBySlug(slug);

  if (!program) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Program not found.
      </div>
    );
  }

  const start = program.startAt ? new Date(program.startAt) : null;
  const end = program.endAt ? new Date(program.endAt) : (start ?? undefined);

  return (
    <article className="relative mx-auto max-w-4xl px-4 py-8">
      <BackButton />
      <ProgramSchema
        program={{
          title: program.title,
          summary: program.summary,
          description: program.description ?? undefined,
          status: program.status as any,
          type: program.type as any,
          startAt: program.startAt ?? null,
          endAt: program.endAt ?? null,
          city: program.city ?? null,
          venue: program.venue ?? null,
          heroUrl: program.heroUrl ?? null,
          slug: program.slug,
        }}
      />
      {program.heroUrl && (
        <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-lg">
          <Image
            src={getImageUrl(program.heroUrl, 'public')}
            alt={program.title}
            fill
            className="object-cover"
          />
        </div>
      )}
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{program.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-neutral-500">
          {start && end && <span>{formatEventDate(start, end)}</span>}
          {(program.city || program.venue) && (
            <span>
              {[program.city, program.venue].filter(Boolean).join(' · ')}
            </span>
          )}
          <CopyUrlButton className="ml-auto text-xs text-neutral-400 hover:text-neutral-600" />
        </div>
      </header>

      {program.description && (
        <p className="mb-12 whitespace-pre-line leading-relaxed text-neutral-700">
          {program.description}
        </p>
      )}

      {program.credits?.length ? (
        <section className="mb-12">
          <ul className="flex flex-wrap gap-4">
            {program.credits.map((c) => {
              const kr = c.artist?.nameKr || null;
              const en = c.artist?.name || null;
              const name = formatArtistName(kr, en);
              const img = c.artist?.mainImageUrl || undefined;
              const initials = artistInitials(en || undefined, kr || undefined);
              return (
                <li key={`${c.programId}-${c.artistId}`}>
                  <Link
                    href={`/artists/${c.artistId}`}
                    className="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                  >
                    <Avatar className="h-8 w-8">
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
                    <span>{name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {program.images?.length ? (
        <section className="mb-10">
          <ProgramGallery
            images={program.images.map((i) => ({
              id: i.id,
              imageUrl: i.imageUrl,
              alt: i.alt,
            }))}
          />
        </section>
      ) : null}

      <div className="mt-12 flex items-center justify-center gap-4 border-t pt-8 text-xs sm:gap-6 sm:text-sm md:text-base">
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
    </article>
  );
}
