import Image from 'next/image';
import { formatEventDate, getImageUrl } from '@/lib/utils';

type ProgramStatus = 'upcoming' | 'completed';
type ProgramType = 'exhibition' | 'live' | 'party' | 'workshop' | 'talk';

export interface ProgramCardModel {
  slug: string;
  title: string;
  summary?: string | null;
  heroUrl?: string | null;
  status: ProgramStatus;
  type: ProgramType;
  startAt: Date | string | null;
  endAt?: Date | string | null;
  city?: string | null;
  venue?: string | null;
}

export function ProgramCard({ program }: { program: ProgramCardModel }) {
  const start = program.startAt ? new Date(program.startAt) : null;
  const end = program.endAt ? new Date(program.endAt) : start;

  return (
    <article className="group">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        <Image
          src={getImageUrl(program.heroUrl || null, 'smaller')}
          alt={program.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="mt-3">
        <h2 className="font-medium text-neutral-900">{program.title}</h2>
        {start && end && (
          <p className="mt-1 text-sm text-neutral-500">
            {formatEventDate(start, end)}
          </p>
        )}
      </div>
    </article>
  );
}
