import Image from 'next/image';
import { getProgramBySlug } from '@/modules/programs/server/actions';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';
import {
  artistInitials,
  formatArtistName,
  formatEventDate,
  getImageUrl,
} from '@/lib/utils';
import ProgramSchema from '@/components/seo/program-schema';
import ProgramGallery from '@/modules/programs/ui/section/program-gallery';
import ShareButton from '@/modules/programs/ui/components/share-button';

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
    <article className="mx-auto max-w-4xl px-4 py-8">
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
      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{program.type}</Badge>
          <Badge>{program.status}</Badge>
        </div>
        <h1 className="text-3xl font-bold">{program.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {start && end && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" /> {formatEventDate(start, end)}
            </span>
          )}
          {(program.city || program.venue) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {[program.city, program.venue].filter(Boolean).join(' · ')}
            </span>
          )}
          <ShareButton
            title={program.title}
            text={program.summary || program.description || undefined}
            className="ml-auto inline-flex items-center gap-1 rounded text-xs underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </header>

      {program.description && (
        <section className="prose prose-neutral dark:prose-invert mb-10 max-w-none">
          <h2>Story</h2>
          <p className="whitespace-pre-line">{program.description}</p>
        </section>
      )}

      {program.credits?.length ? (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Credits</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
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
                    className="group flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`${name} 아티스트 상세 보기`}
                  >
                    <Avatar className="h-10 w-10">
                      {img ? (
                        <AvatarImage
                          src={getImageUrl(img, 'thumbnail')}
                          alt={name}
                        />
                      ) : (
                        <AvatarFallback>{initials}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.artist?.city || c.artist?.country || ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {c.role}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {program.images?.length ? (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Gallery</h2>
          <ProgramGallery
            images={program.images.map((i) => ({
              id: i.id,
              imageUrl: i.imageUrl,
              alt: i.alt,
            }))}
          />
        </section>
      ) : null}

      {(program.city || program.venue) && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Map</h2>
          <div className="flex items-center gap-2 rounded-md border p-4 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {[program.city, program.venue].filter(Boolean).join(' · ')}
          </div>
        </section>
      )}

      {/* Footer actions simplified: calendar removed; share kept in header */}
    </article>
  );
}
