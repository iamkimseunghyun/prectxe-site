import { NewsletterForm } from '@/components/layout/newsletter-form';

export function NewsletterCtaSection() {
  return (
    <section className="bg-neutral-950 py-24 text-white md:py-32">
      <div className="mx-auto max-w-screen-2xl px-6 md:px-12 lg:px-24">
        <div className="grid gap-12 md:grid-cols-2 md:items-end md:gap-16">
          <div>
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
              Stay in the loop
            </p>
            <h2 className="text-3xl font-light leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              Next drop,
              <br />
              <span className="text-neutral-500">first.</span>
            </h2>
            <p className="mt-8 max-w-md text-base leading-relaxed text-neutral-400">
              다음 Drop과 Journal 소식을 받아보세요. 스팸 없이 핵심만.
            </p>
          </div>

          <div className="md:pb-3">
            <div className="[&_button]:border-white [&_button]:text-white [&_button]:hover:bg-white [&_button]:hover:text-neutral-950 [&_input]:border-neutral-700 [&_input]:text-white [&_input]:placeholder:text-neutral-600 [&_input:focus]:border-white">
              <NewsletterForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
