'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { parseInput } from '@/lib/auth/server-action-helpers';
import { prisma } from '@/lib/db/prisma';
import { dropStaffAddSchema } from '@/lib/schemas/drop';

// 어드민: 드랍에 게이트 스태프를 배정·해제한다. 스태프는 이 이메일로 앱에 로그인한다.

export async function addDropStaff(
  dropId: string,
  input: { email: string; name?: string }
) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const parsed = parseInput(dropStaffAddSchema, input);
  if (!parsed.success) return parsed;
  const { email, name } = parsed.data;

  const drop = await prisma.drop.findUnique({
    where: { id: dropId },
    select: { type: true },
  });
  if (!drop)
    return { success: false, error: 'Drop을 찾을 수 없습니다.' } as const;
  if (drop.type !== 'ticket')
    return {
      success: false,
      error: '티켓 드랍에만 스태프를 배정할 수 있습니다.',
    } as const;

  const staff = await prisma.staff.upsert({
    where: { email },
    create: { email, name: name || null },
    // 이름을 비워 보내면 기존 이름을 지우지 않는다
    update: name ? { name } : {},
    select: { id: true },
  });
  await prisma.dropStaff.upsert({
    where: { dropId_staffId: { dropId, staffId: staff.id } },
    create: { dropId, staffId: staff.id },
    update: {},
  });

  revalidatePath(`/admin/drops/${dropId}/edit`);
  return { success: true } as const;
}

/** 배정을 지우면 그 스태프는 다음 요청부터 이 행사에 접근할 수 없다 */
export async function removeDropStaff(dropId: string, staffId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  await prisma.dropStaff.deleteMany({ where: { dropId, staffId } });

  revalidatePath(`/admin/drops/${dropId}/edit`);
  return { success: true } as const;
}
