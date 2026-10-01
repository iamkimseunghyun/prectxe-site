-- ======================================================================
-- DropCredit 테이블 추가 마이그레이션 (프로덕션 적용용)
--
-- 적용 대상:
--   - DropCredit 테이블 생성 (복합 PK [dropId, artistId])
--   - Drop, Artist 외래키 (onDelete: Cascade)
--
-- 실행 방법:
--   1. Neon Console → SQL Editor에서 전체 복붙
--   2. 또는 `psql "$DATABASE_URL" -f 2026-04-21_drop_credit.sql`
--
-- 롤백: 전체 BEGIN/COMMIT 트랜잭션 — 중간 실패 시 자동 롤백
-- ======================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "DropCredit" (
  "dropId"    TEXT         NOT NULL,
  "artistId"  TEXT         NOT NULL,
  "role"      TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DropCredit_pkey" PRIMARY KEY ("dropId", "artistId")
);

DO $$ BEGIN
  ALTER TABLE "DropCredit" ADD CONSTRAINT "DropCredit_dropId_fkey"
    FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DropCredit" ADD CONSTRAINT "DropCredit_artistId_fkey"
    FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

-- 완료 후 확인용 쿼리 (별도 실행)
-- SELECT COUNT(*) AS credit_count FROM "DropCredit";
