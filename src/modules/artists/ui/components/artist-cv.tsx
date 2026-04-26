import { Fragment } from 'react';

interface ArtistCvProps {
  cv: string;
}

type CvEntry = { year: string | null; text: string };

/**
 * CV 본문을 줄 단위로 파싱. 각 줄의 선두에서 4자리 연도를 추출해
 * year 컬럼에, 나머지를 본문에 배치. 연도가 없는 줄은 직전 연도를 이어 사용.
 */
function parseCv(cv: string): CvEntry[] {
  const lines = cv
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let carry: string | null = null;
  return lines.map((line) => {
    const match = line.match(
      /^(\d{4})(?:\s*[-–~]\s*\d{2,4})?\s*[.:\-–]?\s*(.*)$/
    );
    if (match?.[1]) {
      carry = match[1];
      const rest = match[2].trim();
      return { year: carry, text: rest || line };
    }
    return { year: carry, text: line };
  });
}

export function ArtistCv({ cv }: ArtistCvProps) {
  const entries = parseCv(cv);
  let lastYear: string | null = null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 md:gap-x-12">
      {entries.map((entry, i) => {
        const showYear = entry.year && entry.year !== lastYear;
        if (entry.year) lastYear = entry.year;
        return (
          <Fragment key={`${entry.year ?? 'x'}-${i}`}>
            <dt className="text-sm font-medium tabular-nums text-neutral-400">
              {showYear ? entry.year : ''}
            </dt>
            <dd className="text-sm leading-relaxed text-neutral-700">
              {entry.text}
            </dd>
          </Fragment>
        );
      })}
    </dl>
  );
}
