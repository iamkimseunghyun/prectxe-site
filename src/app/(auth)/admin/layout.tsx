import React from 'react';
import { prisma } from '@/lib/db/prisma';
import getSession from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.id) redirect('/auth/signin');
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') redirect('/');
  return <>{children}</>;
}
