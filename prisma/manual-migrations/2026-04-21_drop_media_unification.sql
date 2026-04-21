-- ======================================================================
-- Drop 미디어 통합 마이그레이션 (프로덕션 적용용)
--
-- 적용 대상:
--   - DropMediaType enum 생성
--   - DropMedia 테이블 생성
--   - 기존 DropImage / Drop.videoUrl / Drop.heroUrl → DropMedia 이전
--   - 레거시 컬럼/테이블 제거
--
-- 실행 방법:
--   1. Neon Console → SQL Editor에서 전체 복붙
--   2. 또는 `psql "$DATABASE_URL" -f 2026-04-21_drop_media_unification.sql`
--
-- 롤백: 전체 BEGIN/COMMIT 트랜잭션 — 중간 실패 시 자동 롤백
-- ======================================================================

BEGIN;

-- 1. enum 생성
DO $$ BEGIN
  CREATE TYPE "DropMediaType" AS ENUM ('image', 'video');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. DropMedia 테이블 생성 (이미 있으면 스킵)
CREATE TABLE IF NOT EXISTS "DropMedia" (
  "id" TEXT NOT NULL,
  "dropId" TEXT NOT NULL,
  "type" "DropMediaType" NOT NULL,
  "url" TEXT NOT NULL,
  "alt" TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DropMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DropMedia_dropId_idx" ON "DropMedia"("dropId");

DO $$ BEGIN
  ALTER TABLE "DropMedia" ADD CONSTRAINT "DropMedia_dropId_fkey"
    FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. DropImage → DropMedia (이미지)
INSERT INTO "DropMedia" ("id", "dropId", "type", "url", "alt", "order", "createdAt")
SELECT
  'cmig_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20),
  di."dropId",
  'image'::"DropMediaType",
  di."imageUrl",
  di."alt",
  di."order",
  CURRENT_TIMESTAMP
FROM "DropImage" di
WHERE NOT EXISTS (
  SELECT 1 FROM "DropMedia" dm
  WHERE dm."dropId" = di."dropId"
    AND dm."url" = di."imageUrl"
    AND dm."type" = 'image'::"DropMediaType"
);

-- 4. Drop.videoUrl → DropMedia (영상, 기존 이미지 뒤로)
INSERT INTO "DropMedia" ("id", "dropId", "type", "url", "alt", "order", "createdAt")
SELECT
  'cmvd_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20),
  d."id",
  'video'::"DropMediaType",
  d."videoUrl",
  '',
  COALESCE((SELECT MAX("order") FROM "DropMedia" WHERE "dropId" = d."id"), -1) + 1,
  CURRENT_TIMESTAMP
FROM "Drop" d
WHERE d."videoUrl" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "DropMedia" dm
    WHERE dm."dropId" = d."id"
      AND dm."url" = d."videoUrl"
      AND dm."type" = 'video'::"DropMediaType"
  );

-- 5. Drop.heroUrl → DropMedia (이미지, 맨 앞)
--    기존 미디어의 order를 +1 밀고 hero를 order=0으로 삽입
WITH hero_targets AS (
  SELECT d."id" AS "dropId", d."heroUrl"
  FROM "Drop" d
  WHERE d."heroUrl" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "DropMedia" dm
      WHERE dm."dropId" = d."id"
        AND dm."url" = d."heroUrl"
        AND dm."type" = 'image'::"DropMediaType"
    )
)
UPDATE "DropMedia" SET "order" = "order" + 1
WHERE "dropId" IN (SELECT "dropId" FROM hero_targets);

INSERT INTO "DropMedia" ("id", "dropId", "type", "url", "alt", "order", "createdAt")
SELECT
  'cmhr_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20),
  d."id",
  'image'::"DropMediaType",
  d."heroUrl",
  '',
  0,
  CURRENT_TIMESTAMP
FROM "Drop" d
WHERE d."heroUrl" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "DropMedia" dm
    WHERE dm."dropId" = d."id"
      AND dm."url" = d."heroUrl"
      AND dm."type" = 'image'::"DropMediaType"
  );

-- 6. 레거시 컬럼·테이블 제거
ALTER TABLE "Drop" DROP COLUMN IF EXISTS "heroUrl";
ALTER TABLE "Drop" DROP COLUMN IF EXISTS "videoUrl";
DROP TABLE IF EXISTS "DropImage";

COMMIT;

-- 완료 후 확인용 쿼리 (별도 실행)
-- SELECT COUNT(*) AS media_count, type FROM "DropMedia" GROUP BY type;
-- SELECT COUNT(*) FROM "Drop";
