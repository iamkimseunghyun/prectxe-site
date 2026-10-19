-- ======================================================================
-- TicketTier.accessCode — 비공개(초대 링크) 등급
--
-- 값이 있는 등급은 `/drops/[slug]?code=<accessCode>` 로 들어온 방문자에게만
-- 보이고 주문할 수 있다. null이면 기존과 같은 공개 등급.
--
-- nullable 컬럼 추가뿐이라 기존 데이터·코드와 호환(기존 등급은 전부 공개).
-- 다시 실행해도 안전(IF NOT EXISTS). 배포 전에 dev → prod 순서로 적용할 것.
-- ======================================================================

BEGIN;

ALTER TABLE "TicketTier" ADD COLUMN IF NOT EXISTS "accessCode" TEXT;

COMMIT;

-- 적용 확인:
--   SELECT column_name, is_nullable FROM information_schema.columns
--     WHERE table_name = 'TicketTier' AND column_name = 'accessCode';   -- YES
