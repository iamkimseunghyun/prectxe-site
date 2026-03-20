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
        heroUrl: drop.heroUrl,
        videoUrl: drop.videoUrl,
        publishedAt: drop.publishedAt,
        images: drop.images,
      }}
    />
  );
}
