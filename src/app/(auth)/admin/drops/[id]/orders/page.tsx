import { DropOrdersView } from '@/modules/drops/ui/views/drop-orders-view';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  // 음수·소수·NaN 방어 — skip:(page-1)*pageSize 음수로 인한 Prisma 에러 방지
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  return <DropOrdersView dropId={id} page={page} status={sp.status} q={sp.q} />;
}
