import Link from 'next/link';

export function LegacyRedirectNotice({
  target,
}: {
  target: 'discover' | 'archive';
}) {
  const isDiscover = target === 'discover';
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="mb-3 text-2xl font-semibold">
        콘텐츠 위치가 변경되었어요
      </h1>
      <p className="mb-6 text-muted-foreground">
        이 페이지의 콘텐츠는 프로그램으로 통합되었습니다. 아래 링크에서 최신
        정보를 확인해 주세요.
      </p>
      <Link
        href={
          isDiscover
            ? '/programs?status=upcoming'
            : '/programs?status=completed'
        }
        className="inline-block rounded-md bg-black px-4 py-2 text-white hover:bg-black/90"
      >
        {isDiscover ? '예정 프로그램 보기' : '완료 프로그램 보기'}
      </Link>
    </div>
  );
}
