import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-400">
        404
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-2 text-neutral-500">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          홈으로
        </Link>
        <Link
          href="/programs"
          className="rounded-full border border-neutral-300 px-6 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-400"
        >
          프로그램
        </Link>
      </div>
    </div>
  );
}
