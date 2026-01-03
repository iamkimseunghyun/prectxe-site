/*
  One-time migration: copy legacy Project data to unified Program model.
  Usage:
    bunx ts-node scripts/migrate-legacy-projects-to-programs.ts --dry
    bunx ts-node scripts/migrate-legacy-projects-to-programs.ts --commit

  Notes:
  - Generates unique slugs from Project.title; falls back to id suffix on collision.
  - Maps ProjectCategory → ProgramType: performance→live, festival→party.
  - status: completed if endDate < now else upcoming.
  - Copies images and credits (artists) when available.
*/

import {
  PrismaClient,
  ProgramStatus,
  ProgramType,
  ProjectCategory,
} from '@prisma/client';

const prisma = new PrismaClient();

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 64);
}

function mapCategoryToType(cat: ProjectCategory): ProgramType {
  switch (cat) {
    case 'exhibition':
      return 'exhibition';
    case 'workshop':
      return 'workshop';
    case 'performance':
      return 'live';
    case 'festival':
      return 'party';
    default:
      return 'exhibition';
  }
}

function mapStatus(start: Date, end?: Date | null): ProgramStatus {
  const now = new Date();
  const e = end ?? start;
  return e && e < now ? 'completed' : 'upcoming';
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const commit = args.has('--commit');
  const dry = !commit;

  const projects = await prisma.project.findMany({
    include: {
      images: true,
      projectArtists: true,
      venues: { include: { venue: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const existingSlugs = new Set<string>(
    (await prisma.program.findMany({ select: { slug: true } })).map(
      (p) => p.slug
    )
  );

  let created = 0;
  let skipped = 0;

  for (const p of projects) {
    // Generate candidate slug
    const base = slugify(p.title || 'project');
    let slug = base || `project-${p.id.slice(0, 6)}`;
    let i = 1;
    while (existingSlugs.has(slug)) {
      slug = `${base}-${i++}`;
      if (i > 10) {
        slug = `${base}-${p.id.slice(0, 6)}`;
        break;
      }
    }

    const type = mapCategoryToType(p.category);
    const status = mapStatus(p.startDate, p.endDate);
    const startAt = p.startDate;
    const endAt = p.endDate ?? null;
    const heroUrl = p.mainImageUrl ?? null;

    const venueName = p.venues?.[0]?.venue?.name ?? null;

    if (dry) {
      console.log(
        `[DRY] would create Program: { slug: ${slug}, title: ${p.title}, type: ${type}, status: ${status} }`
      );
      created++;
      existingSlugs.add(slug);
      continue;
    }

    try {
      const program = await prisma.program.create({
        data: {
          slug,
          title: p.title,
          summary: p.about?.slice(0, 160) ?? null,
          description: p.description ?? null,
          type,
          status,
          startAt,
          endAt,
          city: null,
          heroUrl,
          venue: venueName,
          organizer: null,
          userId: p.userId,
          images: p.images.length
            ? {
                createMany: {
                  data: p.images.map((img) => ({
                    imageUrl: img.imageUrl,
                    alt: img.alt,
                    order: img.order,
                  })),
                },
              }
            : undefined,
          credits: p.projectArtists.length
            ? {
                createMany: {
                  data: p.projectArtists.map((pa) => ({
                    artistId: pa.artistId,
                    role: 'artist',
                  })),
                },
              }
            : undefined,
        },
        select: { id: true, slug: true },
      });
      created++;
      existingSlugs.add(program.slug);
    } catch (e) {
      skipped++;
      console.warn(`[SKIP] failed to create program for project ${p.id}:`, e);
    }
  }

  console.log(
    `Done. ${dry ? 'Planned' : 'Created'} programs: ${created}. Skipped: ${skipped}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
