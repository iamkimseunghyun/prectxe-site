import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin } from 'lucide-react';
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

// Status badge removed from list cards as per requirements.

export function ProgramCard({ program }: { program: ProgramCardModel }) {
  const start = program.startAt ? new Date(program.startAt) : null;
  const end = program.endAt ? new Date(program.endAt) : start;

  return (
    <Card className="w-full transition-all focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg">
        <Image
          src={getImageUrl(program.heroUrl || null, 'smaller')}
          alt={program.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        {/* Status badge intentionally removed on listing cards */}
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-1 text-xl font-bold">
          {program.title}
        </CardTitle>
        {program.summary && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {program.summary}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {start && end && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatEventDate(start, end)}</span>
            </div>
          )}
          {(program.city || program.venue) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>
                {[program.city, program.venue].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
          <div>
            <Badge variant="outline">{program.type}</Badge>
          </div>
        </div>
        <div className="mt-4 text-right text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          자세히 보기 →
        </div>
      </CardContent>
    </Card>
  );
}
