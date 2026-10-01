import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const exclude = searchParams.get('exclude');
  if (!slug) return NextResponse.json({ available: false, reason: 'missing' });
  const found = await prisma.article.findUnique({ where: { slug } });
  const available = !found || (exclude && found.slug === exclude);
  return NextResponse.json({ available });
}
