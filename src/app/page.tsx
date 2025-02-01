import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { HeroSection } from '@/components/layout/hero-section';
import { getAllProjects } from '@/app/projects/actions';

export const revalidate = 60; // 1분마다 재검증

export default async function Home() {
  const projects = await getAllProjects();
  return (
    <>
      {/* 히어로 섹션 */}
      <HeroSection />
      {/* 최근 프로젝트 섹션 */}
      <div className="container mx-auto">
        <section className="bg-white py-20">
          <div className="container px-4">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold">Recent Projects</h2>
                <p className="mt-2 text-gray-600">
                  {/*Explore our latest works and exhibitions*/}
                  프렉티스의 모든 프로젝트를 확인하세요.
                </p>
              </div>
              <Link href="/projects">
                <Button variant="outline">View All</Button>
              </Link>
            </div>
            {/* 프로젝트 그리드 */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group relative overflow-hidden rounded-lg"
                >
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {project.mainImageUrl ? (
                      <Image
                        src={`${project.mainImageUrl}/thumbnail`}
                        alt={project.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100">
                        <span className="text-gray-400">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold">{project.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{project.year}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                      {project.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* About 섹션 */}
        <section className="mb-12 bg-gray-50 py-20">
          <div className="container px-4">
            <div className="mx-auto max-w-3xl space-y-6 text-center">
              <h2 className="text-3xl font-bold">About PRECTXE</h2>
              <p className="text-gray-600">
                {/*Since 2018, PRECTXE has been a platform for digital artists to
              showcase their work through exhibitions, performances, and
              workshops. We believe in the power of technology to new.tsx new
              forms of artistic expression.*/}
                2018년, PRECTXE는 디지털 아티스트들의 창의적인 실험을 위한
                플랫폼으로 시작되었습니다. 전시, 공연, 워크숍을 통해 기술과
                예술이 만나는 새로운 경험을 제시합니다.
              </p>
              <div>
                <Link href="/about">
                  <Button variant="outline">더 보기</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
