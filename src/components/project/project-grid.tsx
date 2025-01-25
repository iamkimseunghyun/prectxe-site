// components/projects/project-grid.tsx
import { Project } from '@prisma/client';
import { ProjectCard } from './project-card';

interface ProjectGridProps {
  projects: Project[];
}

export function ProjectGrid({ projects }: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg bg-gray-50 text-gray-500">
        <p>프로젝트가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
