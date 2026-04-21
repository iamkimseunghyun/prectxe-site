import { notFound } from 'next/navigation';
import { getDrop } from '@/modules/drops/server/actions';
import { DropFormView } from '@/modules/drops/ui/views/drop-form-view';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const drop = await getDrop(id);
  if (!drop) notFound();

  return (
    <DropFormView
      drop={{
        id: drop.id,
        title: drop.title,
        slug: drop.slug,
        type: drop.type,
        status: drop.status,
        summary: drop.summary,
        description: drop.description,
        eventDate: drop.eventDate,
        eventEndDate: drop.eventEndDate,
        venue: drop.venue,
        venueAddress: drop.venueAddress,
        notice: drop.notice,
        publishedAt: drop.publishedAt,
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
