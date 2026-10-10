import { unstable_cache as next_cache } from 'next/cache';
import { CACHE_TIMES } from '@/lib/constants/constants';
import { prisma } from '@/lib/db/prisma';
import { kstYear } from '@/modules/programs/constants';

/**
 * 공개 아카이브 목록 — draft를 뺀 모든 프로그램, 최근 행사 먼저.
 *
 * 연도 섹션·유형 필터를 화면에서 하려고 한 번에 가져온다. 캐시 키가 인수 없이
 * 하나라 필터를 바꿔도 엔트리가 늘지 않는다(필터는 호출부에서 메모리 필터).
 * 프로그램이 수백 건을 넘으면 연도 단위로 나눠 읽는 방식으로 바꿀 것.
 *
 * Date는 unstable_cache에서 문자열로 직렬화되므로 처음부터 ISO 문자열로 내보낸다.
 */
export type ArchiveItem = {
  id: string;
  slug: string;
  title: string;
  type: string;
  year: number;
  startAt: string;
  endAt: string | null;
  city: string | null;
  venue: string | null;
  heroUrl: string | null;
  heroWidth: number | null;
  heroHeight: number | null;
};

const ARCHIVE_LIMIT = 500;

export const getArchiveItems = next_cache(
  async (): Promise<ArchiveItem[]> => {
    const rows = await prisma.program.findMany({
      where: { status: { not: 'draft' } },
      orderBy: { startAt: 'desc' },
      take: ARCHIVE_LIMIT,
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        startAt: true,
        endAt: true,
        city: true,
        venue: true,
        heroUrl: true,
        heroWidth: true,
        heroHeight: true,
      },
    });

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      type: r.type,
      year: kstYear(r.startAt),
      startAt: r.startAt.toISOString(),
      endAt: r.endAt ? r.endAt.toISOString() : null,
      city: r.city,
      venue: r.venue,
      heroUrl: r.heroUrl,
      heroWidth: r.heroWidth,
      heroHeight: r.heroHeight,
    }));
  },
  ['program-archive'],
  { revalidate: CACHE_TIMES.PROGRAMS_LIST, tags: ['programs'] }
);
