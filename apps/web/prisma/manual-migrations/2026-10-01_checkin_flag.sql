-- ======================================================================
-- 오프라인 동기화 이상 표시 (CheckIn.flag, CheckIn.undoes)
--
-- 선행: 2026-10-01_checkin_log.sql, 2026-10-01_gate_staff.sql
--
-- 적용 대상:
--   - CheckInFlag enum 생성
--   - CheckIn.flag 컬럼 추가 (nullable — 기존 기록은 정상)
--   - CheckIn.undoes 컬럼 추가 (nullable — 취소 기록이 되돌린 입장의 clientId)
--
-- 추가만 하므로 기존 코드와 호환. 새 코드 배포 전에 dev → prod 순서로 적용.
-- 다시 실행해도 안전.
-- ======================================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE "CheckInFlag" AS ENUM ('duplicate', 'cancelled_ticket');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "flag" "CheckInFlag";
ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "undoes" TEXT;

COMMIT;

-- 적용 확인:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'CheckIn' AND column_name IN ('flag', 'undoes');
