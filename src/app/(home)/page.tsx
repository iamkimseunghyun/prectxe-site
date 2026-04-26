import { FadeIn } from '@/components/shared/fade-in';
import { BrandStatementSection } from '@/modules/home/ui/components/brand-statement-section';
import { FeaturedHeroSection } from '@/modules/home/ui/components/featured-hero-section';
import { NewsletterCtaSection } from '@/modules/home/ui/components/newsletter-cta-section';
import { NowOnSaleSection } from '@/modules/home/ui/components/now-on-sale-section';
import { RecentJournalSection } from '@/modules/home/ui/components/recent-journal-section';
import { UpcomingProgramsSection } from '@/modules/home/ui/components/upcoming-programs-section';

export default function Home() {
  return (
    <>
      <FeaturedHeroSection />
      <FadeIn>
        <BrandStatementSection />
      </FadeIn>
      <FadeIn>
        <UpcomingProgramsSection />
      </FadeIn>
      <FadeIn>
        <NowOnSaleSection />
      </FadeIn>
      <FadeIn>
        <RecentJournalSection />
      </FadeIn>
      <FadeIn>
        <NewsletterCtaSection />
      </FadeIn>
    </>
  );
}
