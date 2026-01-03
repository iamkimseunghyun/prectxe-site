import type { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';
import { getImageUrl } from '@/lib/utils';
import { getProgramBySlug } from '@/modules/programs/server/actions';
import { ProgramDetailView } from '@/modules/programs/ui/views/program-detail-view';

export async function generateStaticParams() {
  const programs = await prisma.program.findMany({ select: { slug: true } });
  return programs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);
  if (!program) return { title: 'Program Not Found' };

  const title = `${program.title} — PRECTXE`;
  const description = program.summary || program.description || undefined;
  const url = `https://prectxe.com/programs/${program.slug}`;
  const hero = program.heroUrl
    ? getImageUrl(program.heroUrl, 'public')
    : undefined;
  const images = hero ? [{ url: hero }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      // Archive-centric: use article for consistency
      type: 'article',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: hero ? [hero] : undefined,
    },
  };
}

const Page = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  return <ProgramDetailView slug={slug} />;
};

export default Page;
