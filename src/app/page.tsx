import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { HeroSection } from '@/components/layout/hero-section';
import { getAllProjects } from '@/app/projects/actions';
import { getRecentEvents } from '@/app/events/actions';
import { Calendar, MapPin } from 'lucide-react';
import { formatEventDate, isEventBookingClosed } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export const revalidate = 60; // 1분마다 재검증

export default async function Home() {
  const projects = await getAllProjects();
  const events = await getRecentEvents();
  return (
    <>
      {/* 히어로 섹션 */}
      <HeroSection />
      {/*<HereFloatingPaths />*/}

      <div className="mx-auto max-w-5xl">
        {/* 이벤트 섹션 */}
        <section className="bg-white pt-20">
          <div className="container px-4">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold">Recent Events</h2>
                <p className="mt-2 text-gray-600">
                  프렉티스의 다양한 이벤트를 만나보세요.
                </p>
              </div>
              <Link href="/events">
                <Button variant="outline">View All</Button>
              </Link>
            </div>
            {/* 이벤트 그리드 */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-[4/3]">
                    {event.mainImageUrl ? (
                      <Image
                        src={`${event.mainImageUrl}/smaller`}
                        alt={event.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100">
                        <span className="text-gray-400">No image</span>
                      </div>
                    )}
                    {/* 이벤트 상태 뱃지 */}
                    <div className="absolute right-3 top-3">
                      <Badge
                        variant={
                          isEventBookingClosed(event.startDate)
                            ? 'secondary'
                            : 'default'
                        }
                      >
                        {isEventBookingClosed(event.startDate)
                          ? 'CLOSED'
                          : 'OPEN'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      {formatEventDate(
                        new Date(event.startDate),
                        new Date(event.endDate)
                      )}
                    </div>
                    <h3 className="mt-4 text-xl font-bold">{event.title}</h3>
                    <p className="mt-2 line-clamp-2 flex-1 text-sm text-gray-600">
                      {event.subtitle}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline">{event.type}</Badge>
                      {event.venue && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3 w-3" />
                          {event.venue.name}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
        {/* 최근 프로젝트 섹션 */}
        <section className="bg-white py-20">
          <div className="container px-4">
            <div className="mb-8 flex items-end justify-between">
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
                  <div className="relative aspect-[4/3]">
                    {project.mainImageUrl ? (
                      <Image
                        src={`${project.mainImageUrl}/smaller`}
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
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-black/0 p-6 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <p className="text-sm font-medium text-gray-200">
                      {project.year}
                    </p>
                    <h3 className="mt-2 text-xl font-bold leading-tight">
                      {project.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-200">
                      {project.about}
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
