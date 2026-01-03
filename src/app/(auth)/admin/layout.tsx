import React from 'react';
import { prisma } from '@/lib/db/prisma';
import getSession from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/admin-nav';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

async function handleLogout() {
  'use server';
  const session = await getSession();
  if (session.id) {
    session.destroy();
  }
  redirect('/');
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.id) redirect('/auth/signin');

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { role: true, username: true },
  });

  if (user?.role !== 'ADMIN') redirect('/');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Admin
          </h1>
          {user?.username && (
            <p className="mt-1 text-sm text-muted-foreground">
              {user.username}님으로 로그인됨
            </p>
          )}
        </div>
        <form action={handleLogout}>
          <Button variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            로그아웃
          </Button>
        </form>
      </header>

      {/* Tab Navigation */}
      <div className="mb-6">
        <AdminNav />
      </div>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
