import ProjectSection from '@/modules/projects/ui/section/project-section';
import EventSection from '@/modules/events/ui/section/event-section';
import AboutSection from '@/modules/about/ui/section/about-section';
import { HeroSection } from '@/modules/home/ui/section/hero-section';

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
