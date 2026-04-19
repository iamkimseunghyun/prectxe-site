import type { ReactNode } from 'react';

interface LegalPageLayoutProps {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}

/**
 * 법적 페이지(이용약관·개인정보처리방침·환불정책) 공통 레이아웃.
 * 하위에서 <section>, <h2>, <h3>, <p>, <ul> 등을 자유롭게 쓰고,
 * 여기서 CSS 변수로 일괄 스타일링한다.
 */
export function LegalPageLayout({
  title,
  effectiveDate,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <header className="mb-10 border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          시행일: {effectiveDate}
        </p>
      </header>

      <div
        className="
          text-[15px] leading-relaxed text-neutral-700
          [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-neutral-900 [&_h2:first-child]:mt-0
          [&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-neutral-900
          [&_p]:mt-4
          [&_ul]:mt-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2
          [&_ol]:mt-3 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-2
          [&_a]:text-neutral-900 [&_a]:underline [&_a]:underline-offset-2
          [&_strong]:font-semibold [&_strong]:text-neutral-900
          [&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
          [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold
          [&_td]:border [&_td]:border-neutral-200 [&_td]:p-2 [&_td]:align-top
        "
      >
        {children}
      </div>
    </div>
  );
}
