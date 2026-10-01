-- ======================================================================
-- 게이트 스태프 + 로그인 (Staff / DropStaff / StaffLoginCode / StaffSession)
--
-- 선행: 2026-10-01_checkin_log.sql (CheckIn 테이블이 있어야 한다)
--
-- 적용 대상:
--   - Staff, DropStaff, StaffLoginCode, StaffSession 테이블·인덱스·FK
--   - CheckIn.staffId 컬럼 + FK (스태프 삭제 시 SET NULL — 기록은 남긴다)
--
-- 전부 추가만 하므로 기존 코드와 호환된다. 새 코드를 배포하기 전에 먼저
-- 적용할 것.
--
-- 실행 방법: dev(program-model-v1) → prod(main) 순서로
--   1. Neon Console → SQL Editor에서 브랜치를 고른 뒤 전체 복붙
--   2. 또는 `psql "$DATABASE_URL" -f 2026-10-01_gate_staff.sql`
--
-- 다시 실행해도 안전 (IF NOT EXISTS / duplicate_object 무시).
-- ======================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "Staff" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DropStaff" (
  "dropId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DropStaff_pkey" PRIMARY KEY ("dropId", "staffId")
);

CREATE TABLE IF NOT EXISTS "StaffLoginCode" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffLoginCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StaffSession" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "staffId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Staff_email_key" ON "Staff"("email");
CREATE INDEX IF NOT EXISTS "DropStaff_staffId_idx" ON "DropStaff"("staffId");
CREATE INDEX IF NOT EXISTS "StaffLoginCode_staffId_createdAt_idx" ON "StaffLoginCode"("staffId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "StaffSession_tokenHash_key" ON "StaffSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "StaffSession_staffId_idx" ON "StaffSession"("staffId");
CREATE INDEX IF NOT EXISTS "CheckIn_staffId_idx" ON "CheckIn"("staffId");

DO $$ BEGIN
  ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DropStaff" ADD CONSTRAINT "DropStaff_dropId_fkey"
    FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DropStaff" ADD CONSTRAINT "DropStaff_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StaffLoginCode" ADD CONSTRAINT "StaffLoginCode_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

-- 적용 확인:
--   SELECT table_name FROM information_schema.tables
--     WHERE table_name IN ('Staff','DropStaff','StaffLoginCode','StaffSession');
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'CheckIn' AND column_name = 'staffId';
