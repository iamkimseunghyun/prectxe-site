import Image from 'next/image';
import Link from 'next/link';
import { imageRatio, JustifiedItem } from '@/components/image/justified-grid';
import { formatKstDateRange, getImageUrl } from '@/lib/utils';
import type { ArchiveItem } from '@/modules/programs/server/queries';

/** 아카이브 목록의 한 칸 — 대표 이미지를 원본 비율대로, 제목·날짜는 아래에. */
export function ArchiveTile({
  item,
  priority = false,
}: {
  item: ArchiveItem;
  priority?: boolean;
}) {
  const ratio = imageRatio(item.heroWidth, item.heroHeight);
  const start = new Date(item.startAt);
  const end = item.endAt ? new Date(item.endAt) : start;

  return (
    <JustifiedItem ratio={ratio}>
      <Link href={`/programs/${item.slug}`} className="group block">
        <div
          className="relative w-full overflow-hidden bg-neutral-100"
          style={{ aspectRatio: ratio }}
        >
          {/* 제목이 바로 아래 텍스트로 있어 이미지는 장식 — 스크린리더 중복 낭독 방지 */}
          <Image
            src={getImageUrl(item.heroUrl, 'smaller')}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1152px) 540px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
          />
        </div>
        <h3 className="mt-3 font-medium text-neutral-900">{item.title}</h3>
        <p className="mt-1 text-sm text-neutral-500">
          {formatKstDateRange(start, end)}
        </p>
      </Link>
    </JustifiedItem>
  );
}
