import { BrandStatementSection } from '@/modules/home/ui/section/brand-statement-section';
import { FeaturedArtistsSection } from '@/modules/home/ui/section/featured-artists-section';
import { FeaturedHeroSection } from '@/modules/home/ui/section/featured-hero-section';
import { NewsletterCtaSection } from '@/modules/home/ui/section/newsletter-cta-section';
import { NowOnSaleSection } from '@/modules/home/ui/section/now-on-sale-section';
import { RecentJournalSection } from '@/modules/home/ui/section/recent-journal-section';

export default function Home() {
  return (
    <>
      <FeaturedHeroSection />
      <BrandStatementSection />
      <NowOnSaleSection />
      <RecentJournalSection />
      <FeaturedArtistsSection />
      <NewsletterCtaSection />
    </>
  );
}
