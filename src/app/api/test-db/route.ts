import { prisma } from '@/lib/db/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1+1`;
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    );
  }
}
