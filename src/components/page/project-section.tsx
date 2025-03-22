import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { prisma } from '@/lib/db/prisma';

const ProjectSection = async () => {
  const projects = await prisma.project.findMany({
    orderBy: {
      startDate: 'desc',
    },
    take: 6,
  });
  return (
    <section className="bg-white pt-20">
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
                    width={400}
                    height={400}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="absolute object-cover transition-transform duration-300 group-hover:scale-105"
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
  );
};

export default ProjectSection;
