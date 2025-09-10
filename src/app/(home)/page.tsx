import AboutSection from '@/modules/about/ui/section/about-section';
import { FeaturedHeroSection } from '@/modules/home/ui/section/featured-hero-section';
import { JournalHighlightsSection } from '@/modules/home/ui/section/journal-highlights-section';
import { FollowUsSection } from '@/modules/home/ui/section/follow-us-section';

export const dynamic = 'force-static';

export default async function Home() {
  return (
    <>
      {/* 히어로 섹션 (가장 가까운 프로그램) */}
      <FeaturedHeroSection />
      {/* 아카이브 중심: Next Up 섹션 제거 */}
      {/* Journal (소식) */}
      <JournalHighlightsSection />
      {/* About 섹션 */}
      <div className="mx-auto max-w-5xl">
        <AboutSection />
      </div>
      {/* SNS Follow 섹션 */}
      <FollowUsSection />
    </>
  );
}
