import type { Metadata } from 'next';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe';
import { UnsubscribeForm } from '@/modules/email/ui/components/unsubscribe-form';

export const metadata: Metadata = {
  title: '뉴스레터 수신 거부',
  description: 'PRECTXE 뉴스레터 수신을 해지합니다.',
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;

  // 토큰 검증은 서버에서만 한다 — 서명 키가 클라이언트로 나가면 안 된다.
  // 여기서 바로 해지하지 않는 이유: 메일 클라이언트·보안 스캐너의 링크
  // 프리페치(GET)로 의도치 않은 해지가 일어날 수 있다. 사용자가 버튼을
  // 눌러야 처리한다. 원클릭 해지는 List-Unsubscribe 헤더(POST)가 담당한다.
  const email = t ? verifyUnsubscribeToken(t) : null;

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        뉴스레터 수신 거부
      </h1>
      <UnsubscribeForm token={t} knownEmail={email} />
    </main>
  );
}
