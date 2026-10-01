import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import { prisma } from '@/lib/db/prisma';

// 게이트 앱 스태프 인증. 비밀번호 없이 이메일로 받은 6자리 코드로 로그인하고,
// 앱은 이후 요청마다 `Authorization: Bearer <token>`을 보낸다.
// 코드·토큰 원문은 저장하지 않고 SHA-256 해시만 둔다.

export const LOGIN_CODE_TTL_MINUTES = 10;
const LOGIN_CODE_MAX_ATTEMPTS = 5;
// 스태프는 개인 휴대폰을 쓴다 — 행사 당일 현장에서 재로그인을 요구하지 않도록 길게 둔다
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type StaffIdentity = { id: string; email: string; name: string | null };

const staffSelect = { id: true, email: true, name: true } as const;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// staffId를 섞어 같은 코드라도 스태프마다 해시가 달라지게 한다
function hashCode(staffId: string, code: string): string {
  return sha256(`${staffId}:${code}`);
}

/**
 * 배정된 행사가 하나라도 있는 스태프에게만 코드를 발급한다. 아니면 null —
 * 호출 쪽은 두 경우를 같은 응답으로 돌려 가입 여부가 드러나지 않게 해야 한다.
 */
export async function issueLoginCode(
  email: string
): Promise<{ code: string; staff: StaffIdentity } | null> {
  const staff = await prisma.staff.findUnique({
    where: { email },
    select: { ...staffSelect, _count: { select: { drops: true } } },
  });
  if (!staff || staff._count.drops === 0) return null;

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const now = new Date();
  await prisma.$transaction([
    // 새 코드를 내면 이전 코드는 소비 처리 — 메일이 여러 통 와도 마지막 것만 통한다
    prisma.staffLoginCode.updateMany({
      where: { staffId: staff.id, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.staffLoginCode.create({
      data: {
        staffId: staff.id,
        codeHash: hashCode(staff.id, code),
        expiresAt: new Date(now.getTime() + LOGIN_CODE_TTL_MINUTES * 60_000),
      },
    }),
  ]);

  return {
    code,
    staff: { id: staff.id, email: staff.email, name: staff.name },
  };
}

/** 코드가 맞으면 세션을 만들어 토큰을 돌려준다. 틀리거나 만료·소진됐으면 null */
export async function verifyLoginCode(
  email: string,
  code: string
): Promise<{ token: string; expiresAt: Date; staff: StaffIdentity } | null> {
  const staff = await prisma.staff.findUnique({
    where: { email },
    select: staffSelect,
  });
  if (!staff) return null;

  const now = new Date();
  const latest = await prisma.staffLoginCode.findFirst({
    where: { staffId: staff.id, usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, codeHash: true },
  });
  if (!latest) return null;

  // 비교 전에 시도 횟수를 조건부로 먼저 올린다. 읽고-비교하고-올리면 동시
  // 요청이 같은 횟수를 읽어 한도보다 많이 시도할 수 있다.
  const reserved = await prisma.staffLoginCode.updateMany({
    where: {
      id: latest.id,
      usedAt: null,
      attempts: { lt: LOGIN_CODE_MAX_ATTEMPTS },
    },
    data: { attempts: { increment: 1 } },
  });
  if (reserved.count === 0) return null;

  const matches = timingSafeEqual(
    Buffer.from(latest.codeHash, 'hex'),
    Buffer.from(hashCode(staff.id, code), 'hex')
  );
  if (!matches) return null;

  // 같은 코드로 동시에 두 번 들어와도 세션은 하나만 만든다
  const consumed = await prisma.staffLoginCode.updateMany({
    where: { id: latest.id, usedAt: null },
    data: { usedAt: now },
  });
  if (consumed.count === 0) return null;

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await prisma.staffSession.create({
    data: { staffId: staff.id, tokenHash: sha256(token), expiresAt },
  });
  return { token, expiresAt, staff };
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export async function getStaffFromRequest(
  request: Request
): Promise<StaffIdentity | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const session = await prisma.staffSession.findUnique({
    where: { tokenHash: sha256(token) },
    select: { expiresAt: true, staff: { select: staffSelect } },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.staff;
}

export async function revokeStaffSession(request: Request): Promise<void> {
  const token = bearerToken(request);
  if (!token) return;
  await prisma.staffSession.deleteMany({
    where: { tokenHash: sha256(token) },
  });
}

export async function isStaffAssigned(
  staffId: string,
  dropId: string
): Promise<boolean> {
  const assignment = await prisma.dropStaff.findUnique({
    where: { dropId_staffId: { dropId, staffId } },
    select: { dropId: true },
  });
  return assignment !== null;
}
