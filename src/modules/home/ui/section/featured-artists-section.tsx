import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { formatArtistName, getImageUrl } from '@/lib/utils';

export async function FeaturedArtistsSection() {
  const artists = await prisma.artist.findMany({
    where: { mainImageUrl: { not: null } },
    take: 8,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      nameKr: true,
      mainImageUrl: true,
      city: true,
    },
  });

  if (artists.length === 0) return null;

  return (
    <section className="bg-white pb-24 pt-0 md:pb-32">
      <div className="mx-auto max-w-screen-2xl px-6 md:px-12 lg:px-24">
        <div className="mb-14 flex items-end justify-between gap-6 md:mb-20">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500 md:mb-6">
              Network
            </p>
            <h2 className="text-3xl font-light leading-[1.15] tracking-tight text-neutral-900 md:text-5xl lg:text-6xl">
              Artists
            </h2>
          </div>
          <Link
            href="/artists"
            className="hidden shrink-0 items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 sm:inline-flex"
          >
            전체 보기 <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 md:gap-8">
          {artists.map((artist) => {
            const name = formatArtistName(artist.nameKr, artist.name);
            return (
              <li key={artist.id}>
                <Link href={`/artists/${artist.id}`} className="group block">
                  <div className="relative aspect-square overflow-hidden rounded-full bg-neutral-100">
                    {artist.mainImageUrl && (
                      <Image
                        src={getImageUrl(artist.mainImageUrl, 'public')}
                        alt={name}
                        fill
                        sizes="(min-width: 768px) 25vw, 50vw"
                        className="object-cover grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
                      />
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm font-medium text-neutral-900 transition-colors group-hover:text-neutral-600">
                      {name}
                    </p>
                    {artist.city && (
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {artist.city}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href="/artists"
          className="mt-10 inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 sm:hidden"
        >
          전체 보기 <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
