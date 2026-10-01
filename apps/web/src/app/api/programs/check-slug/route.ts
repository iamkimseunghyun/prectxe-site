import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const excludeId = searchParams.get('excludeId');
  if (!slug) return NextResponse.json({ available: false, reason: 'missing' });

  const found = await prisma.program.findUnique({ where: { slug } });
  // If editing current program, allow same slug
  const available = !found || (excludeId && found.id === excludeId);
  return NextResponse.json({ available });
}
