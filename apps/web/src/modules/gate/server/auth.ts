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
//
// 코드는 요청(challenge) 단위다. request-code 응답의 challengeId를 가진 앱만
// 그 코드를 확인할 수 있어서, 남이 같은 이메일로 코드를 요청하거나 틀린 코드를
// 넣어도 스태프 본인 요청의 코드·시도 횟수는 그대로다. 그래서 새 코드를 낼 때
// 이전 코드를 무효화하지 않는다 — 무효화하면 코드 요청만으로 로그인을 막을 수 있다.

export const LOGIN_CODE_TTL_MINUTES = 10;
const LOGIN_CODE_MAX_ATTEMPTS = 5;
// 스태프는 개인 휴대폰을 쓴다 — 행사 당일 현장에서 재로그인을 요구하지 않도록 길게 둔다
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type StaffIdentity = { id: string; email: string; name: string | null };

const staffSelect = { id: true, email: true, name: true } as const;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// challengeId를 섞어 같은 코드라도 요청마다 해시가 달라지게 한다
function hashCode(challengeId: string, code: string): string {
  return sha256(`${challengeId}:${code}`);
}

/**
 * challengeId로 로그인 코드를 발급한다. 배정된 행사가 하나라도 있는 스태프가
 * 아니면 null. 응답을 보낸 뒤(after) 실행해야 한다 — 스태프 여부에 따라 DB
 * 작업량이 달라 응답 시간으로 가입 여부가 드러난다.
 */
export async function issueLoginCode(
  email: string,
  challengeId: string
): Promise<{ code: string; staff: StaffIdentity } | null> {
  const staff = await prisma.staff.findUnique({
    where: { email },
    select: { ...staffSelect, _count: { select: { drops: true } } },
  });
  if (!staff || staff._count.drops === 0) return null;

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const now = new Date();
  await prisma.$transaction([
    // 쓴 코드·만료된 코드·만료된 세션은 발급할 때 같이 치운다 (크론 없이)
    prisma.staffLoginCode.deleteMany({
      where: {
        staffId: staff.id,
        OR: [{ usedAt: { not: null } }, { expiresAt: { lt: now } }],
      },
    }),
    prisma.staffSession.deleteMany({
      where: { staffId: staff.id, expiresAt: { lt: now } },
    }),
    prisma.staffLoginCode.create({
      data: {
        id: challengeId,
        staffId: staff.id,
        codeHash: hashCode(challengeId, code),
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
  challengeId: string,
  code: string
): Promise<{ token: string; expiresAt: Date; staff: StaffIdentity } | null> {
  const now = new Date();
  const challenge = await prisma.staffLoginCode.findUnique({
    where: { id: challengeId },
    select: {
      codeHash: true,
      expiresAt: true,
      usedAt: true,
      staff: { select: staffSelect },
    },
  });
  // 이메일까지 맞아야 한다 — challengeId만 알아서는 남의 코드를 시도할 수 없게
  if (
    !challenge ||
    challenge.staff.email !== email ||
    challenge.usedAt !== null ||
    challenge.expiresAt <= now
  )
    return null;

  // 비교 전에 시도 횟수를 조건부로 먼저 올린다. 읽고-비교하고-올리면 동시
  // 요청이 같은 횟수를 읽어 한도보다 많이 시도할 수 있다.
  const reserved = await prisma.staffLoginCode.updateMany({
    where: {
      id: challengeId,
      usedAt: null,
      attempts: { lt: LOGIN_CODE_MAX_ATTEMPTS },
    },
    data: { attempts: { increment: 1 } },
  });
  if (reserved.count === 0) return null;

  const matches = timingSafeEqual(
    Buffer.from(challenge.codeHash, 'hex'),
    Buffer.from(hashCode(challengeId, code), 'hex')
  );
  if (!matches) return null;

  // 같은 코드로 동시에 두 번 들어와도 세션은 하나만 만든다
  const consumed = await prisma.staffLoginCode.updateMany({
    where: { id: challengeId, usedAt: null },
    data: { usedAt: now },
  });
  if (consumed.count === 0) return null;

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await prisma.staffSession.create({
    data: {
      staffId: challenge.staff.id,
      tokenHash: sha256(token),
      expiresAt,
    },
  });
  return { token, expiresAt, staff: challenge.staff };
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

// 로그인 세션이 살아 있는 스태프. 세션을 select로 따라가면 Prisma가 관계마다
// 쿼리를 따로 보낸다(세션 → 스태프 → 배정 = DB 왕복 3번, 왕복마다 ~75ms).
// where의 관계 조건은 SQL 안의 서브쿼리가 되므로 한 번에 끝난다
function withLiveSession(token: string) {
  return {
    sessions: {
      some: { tokenHash: sha256(token), expiresAt: { gt: new Date() } },
    },
  };
}

export async function getStaffFromRequest(
  request: Request
): Promise<StaffIdentity | null> {
  const token = bearerToken(request);
  if (!token) return null;
  return prisma.staff.findFirst({
    where: withLiveSession(token),
    select: staffSelect,
  });
}

/**
 * 세션 확인과 행사 배정 확인을 쿼리 하나로. 게이트 API의 모든 요청(15초 명단
 * 폴링 포함)이 거치는 길이라 왕복 수가 그대로 응답 시간이다.
 */
export async function getStaffForDrop(
  request: Request,
  dropId: string
): Promise<{ staff: StaffIdentity; assigned: boolean } | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const row = await prisma.staff.findFirst({
    where: withLiveSession(token),
    select: {
      ...staffSelect,
      _count: { select: { drops: { where: { dropId } } } },
    },
  });
  if (!row) return null;
  const { _count, ...staff } = row;
  return { staff, assigned: _count.drops > 0 };
}

export async function revokeStaffSession(request: Request): Promise<void> {
  const token = bearerToken(request);
  if (!token) return;
  await prisma.staffSession.deleteMany({
    where: { tokenHash: sha256(token) },
  });
}
