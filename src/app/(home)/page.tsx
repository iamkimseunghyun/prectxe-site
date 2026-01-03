import { FeaturedHeroSection } from '@/modules/home/ui/section/featured-hero-section';

export const dynamic = 'force-static';

export default async function Home() {
  return <FeaturedHeroSection />;
}
