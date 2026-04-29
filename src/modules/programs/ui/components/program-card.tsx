import Image from 'next/image';
import { cn, formatEventDate, getImageUrl } from '@/lib/utils';

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

const STATUS_STYLE: Record<
  ProgramStatus,
  { label: string; className: string }
> = {
  upcoming: {
    label: 'Upcoming',
    className: 'bg-white/95 text-neutral-900',
  },
  completed: {
    label: 'Archive',
    className: 'bg-neutral-900/75 text-white',
  },
};

export function ProgramCard({
  program,
  priority = false,
}: {
  program: ProgramCardModel;
  priority?: boolean;
}) {
  const start = program.startAt ? new Date(program.startAt) : null;
  const end = program.endAt ? new Date(program.endAt) : start;
  const status = STATUS_STYLE[program.status];

  return (
    <article className="group">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        <Image
          src={getImageUrl(program.heroUrl || null, 'smaller')}
          alt={program.title}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {status && (
          <span
            className={cn(
              'absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] backdrop-blur-sm',
              status.className
            )}
          >
            {status.label}
          </span>
        )}
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
