import { HeroSection } from '@/components/layout/hero-section';
import EventSection from '@/components/page/event-section';
import ProjectSection from '@/components/page/project-section';
import AboutSection from '@/components/page/about-section';

export const dynamic = 'force-static';

export default async function Home() {
  return (
    <>
      {/* 히어로 섹션 */}
      <HeroSection />
      <div className="mx-auto max-w-5xl">
        {/* 최근 프로젝트 섹션 */}
        <ProjectSection />

        {/* 이벤트 섹션 */}
        <EventSection />

        {/* About 섹션 */}
        <AboutSection />
      </div>
    </>
  );
}
