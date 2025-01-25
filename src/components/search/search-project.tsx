import { prisma } from '@/lib/prisma';
import { ProjectCard } from '@/components/project/project-card';

const searchContent = async (query: string) => {
  const searchTerm = query.toLowerCase();
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { title: { contains: searchTerm } },
        { description: { contains: searchTerm } },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // 향후 아티스트, 작품 등 검색 추가 가능

  return {
    projects,
    // artists,
    // artworks,
  };
};

interface Props {
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params?.q ?? '';

  const results = await searchContent(query);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">검색 결과</h1>
        <p className="text-gray-600">&quot;{query}&quot;에 대한 검색 결과</p>
      </div>

      {/* 프로젝트 결과 */}
      {results.projects.length > 0 && (
        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">
            프로젝트 ({results.projects.length})
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {results.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* 검색 결과가 없는 경우 */}
      {!results.projects.length && (
        <div className="py-12 text-center text-gray-500">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}
