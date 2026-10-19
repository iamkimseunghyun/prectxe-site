import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDropBySlug } from '@/modules/drops/server/actions';
import { GoodsDropDetailView } from '@/modules/drops/ui/views/goods-drop-detail-view';
import { TicketDropDetailView } from '@/modules/drops/ui/views/ticket-drop-detail-view';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ code?: string | string[] }>;
}

// 비공개 등급 초대 코드(`?code=`). 배열·과도한 길이는 무시한다.
function parseAccessCode(code: string | string[] | undefined) {
  return typeof code === 'string' && code.length <= 64 ? code : undefined;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  // 메타데이터에는 코드를 넘기지 않는다 — 비공개 등급 정보가 미리보기·검색 결과에
  // 새지 않게 공개 등급 기준으로만 만든다.
  const drop = await getDropBySlug(slug);
  if (!drop) return {};
  const hasCode = !!parseAccessCode((await searchParams).code);

  const title = drop.title;
  const description =
    drop.summary ||
    (drop.type === 'ticket'
      ? `${drop.title} 티켓 — PRECTXE`
      : `${drop.title} — PRECTXE`);

  return {
    title,
    description,
    // 초대 링크로 들어온 페이지는 검색에 노출하지 않는다
    ...(hasCode && { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description,
      type: 'website',
      // og:image는 opengraph-image.tsx가 자동 생성
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const accessCode = parseAccessCode((await searchParams).code);
  const drop = await getDropBySlug(slug, accessCode);

  if (!drop?.publishedAt) {
    notFound();
  }

  if (drop.type === 'ticket') {
    return <TicketDropDetailView drop={drop} accessCode={accessCode} />;
  }

  return <GoodsDropDetailView drop={drop} />;
}
