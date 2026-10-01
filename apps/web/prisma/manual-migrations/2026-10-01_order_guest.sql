-- ======================================================================
-- 게스트리스트 (Order.isGuest, Order.note)
--
-- 적용 대상:
--   - Order.isGuest 컬럼 추가 (기본 false — 기존 주문은 전부 판매 주문)
--   - Order.note 컬럼 추가 (nullable — 게스트 메모)
--
-- 추가만 하므로 기존 코드와 호환. 새 코드 배포 전에 dev → prod 순서로 적용.
-- 다시 실행해도 안전.
-- ======================================================================

BEGIN;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "isGuest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "note" TEXT;

COMMIT;

-- 적용 확인:
--   SELECT column_name, column_default FROM information_schema.columns
--     WHERE table_name = 'Order' AND column_name IN ('isGuest', 'note');
