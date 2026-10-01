-- ======================================================================
-- 입장 기록(CheckIn) + 재입장 허용 설정
--
-- 적용 대상:
--   - CheckInKind enum 생성
--   - Drop.allowReentry 컬럼 추가 (기본 false — 기존 동작 그대로)
--   - CheckIn 테이블·인덱스·FK 생성
--
-- 전부 추가만 하므로 기존 코드와 호환된다. **새 코드를 배포하기 전에** 먼저
-- 적용해야 한다 — Drop을 기본 select로 읽는 쿼리가 allowReentry 컬럼을
-- 요구하므로, 순서가 뒤집히면 드랍 페이지가 500이 된다.
--
-- 실행 방법: dev(program-model-v1) → prod(main) 순서로
--   1. Neon Console → SQL Editor에서 브랜치를 고른 뒤 전체 복붙
--   2. 또는 `psql "$DATABASE_URL" -f 2026-10-01_checkin_log.sql`
--
-- 다시 실행해도 안전 (IF NOT EXISTS / duplicate_object 무시).
-- 롤백: 전체 BEGIN/COMMIT 트랜잭션 — 중간 실패 시 자동 롤백
-- ======================================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE "CheckInKind" AS ENUM ('entry', 'undo');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Drop"
  ADD COLUMN IF NOT EXISTS "allowReentry" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "CheckIn" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "kind" "CheckInKind" NOT NULL,
  "ticketId" TEXT NOT NULL,
  "dropId" TEXT NOT NULL,
  "gate" TEXT,
  "userId" TEXT,
  "scannedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CheckIn_clientId_key" ON "CheckIn"("clientId");
CREATE INDEX IF NOT EXISTS "CheckIn_ticketId_idx" ON "CheckIn"("ticketId");
CREATE INDEX IF NOT EXISTS "CheckIn_dropId_createdAt_idx" ON "CheckIn"("dropId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_dropId_fkey"
    FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

-- 적용 확인:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'Drop' AND column_name = 'allowReentry';
--   SELECT count(*) FROM "CheckIn";
