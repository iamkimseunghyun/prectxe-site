import { notFound } from 'next/navigation';
import { getDrop } from '@/modules/drops/server/actions';
import { DropFormView } from '@/modules/drops/ui/admin/drop-form-view';
import { getDropStaff } from '@/modules/gate/server/queries';
import { getVenueOptions } from '@/modules/venues/server/actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const [drop, venues] = await Promise.all([getDrop(id), getVenueOptions()]);
  // getDrop이 어드민이 아니면 null — 스태프 목록은 그 확인을 통과한 뒤에만 읽는다
  if (!drop) notFound();
  const staff = drop.type === 'ticket' ? await getDropStaff(id) : [];

  return (
    <DropFormView
      venues={venues}
      staff={staff}
      drop={{
        id: drop.id,
        title: drop.title,
        slug: drop.slug,
        type: drop.type,
        summary: drop.summary,
        description: drop.description,
        eventDate: drop.eventDate,
        eventEndDate: drop.eventEndDate,
        venue: drop.venue,
        venueAddress: drop.venueAddress,
        venueId: drop.venueId,
        notice: drop.notice,
        publishedAt: drop.publishedAt,
        allowReentry: drop.allowReentry,
        media: drop.media,
        credits: drop.credits.map((c) => ({
          artistId: c.artistId,
          role: c.role,
          artist: {
            id: c.artist.id,
            name: c.artist.name,
            nameKr: c.artist.nameKr,
            mainImageUrl: c.artist.mainImageUrl,
          },
        })),
      }}
    />
  );
}
