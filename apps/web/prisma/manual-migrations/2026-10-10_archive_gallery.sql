-- ======================================================================
-- 아카이브 갤러리 — 이미지 원본 크기·캡션 + 목록 정렬 인덱스
--
-- 갤러리가 이미지를 원본 비율대로 배치하려면 크기를 알아야 한다(CLS 방지).
--   - ProgramImage.width / height  : 갤러리 이미지 크기
--   - Program.heroWidth / heroHeight : 목록 대표 이미지 크기
--   - ProgramImage.caption          : 사진 설명·촬영자 표기(alt와 별개)
--   - Program(startAt) 인덱스        : 목록이 startAt 내림차순인데 기존 인덱스는
--                                     [isFeatured, updatedAt]뿐이었다
--
-- 전부 nullable 추가 + IF NOT EXISTS라 기존 데이터·코드와 호환, 재실행 안전.
-- 크기 백필은 scripts/archive-backfill-dimensions.ts (적용 후 실행).
-- ======================================================================

BEGIN;

ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "heroWidth" INTEGER;
ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "heroHeight" INTEGER;

ALTER TABLE "ProgramImage" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "ProgramImage" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "ProgramImage" ADD COLUMN IF NOT EXISTS "caption" TEXT;

CREATE INDEX IF NOT EXISTS "Program_startAt_idx" ON "Program"("startAt");

COMMIT;

-- 적용 확인:
--   SELECT table_name, column_name, is_nullable FROM information_schema.columns
--     WHERE (table_name = 'Program' AND column_name IN ('heroWidth','heroHeight'))
--        OR (table_name = 'ProgramImage' AND column_name IN ('width','height','caption'));  -- 5행, 전부 YES
--   SELECT indexname FROM pg_indexes WHERE indexname = 'Program_startAt_idx';               -- 1행
