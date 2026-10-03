-- ======================================================================
-- OrderItem.ticketTierId — prod를 schema.prisma와 맞춘다 (drift 수정)
--
-- 발견(2026-10-03): 프로덕션에서 게스트 추가가 실패했다 —
--   prisma.order.create() → P2011 Null constraint violation (OrderItem).
-- schema.prisma와 dev는 `ticketTierId String?` + onDelete: SetNull인데
-- prod(main)만 예전 정의로 남아 있었다.
--   - NOT NULL  → 등급 없는 주문(게스트 #100, 굿즈 주문)을 만들 수 없다
--   - ON DELETE CASCADE → 판매가 모두 취소된 등급(soldCount 0)을 지우면 그
--     취소 주문들의 OrderItem과 (Ticket_orderItemId CASCADE로) 티켓까지 지워진다.
--     schema 의도는 SET NULL(주문 기록은 남기고 등급 연결만 끊음)
--
-- 완화만 하므로 기존 데이터·코드와 호환(prod OrderItem 98건 모두 ticketTierId 있음).
-- dev(program-model-v1)는 이미 이 상태 — 다시 실행해도 안전.
-- ======================================================================

BEGIN;

ALTER TABLE "OrderItem" ALTER COLUMN "ticketTierId" DROP NOT NULL;

ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_ticketTierId_fkey";
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_ticketTierId_fkey"
  FOREIGN KEY ("ticketTierId") REFERENCES "TicketTier"("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

COMMIT;

-- 적용 확인:
--   SELECT is_nullable FROM information_schema.columns
--     WHERE table_name = 'OrderItem' AND column_name = 'ticketTierId';      -- YES
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--     WHERE conname = 'OrderItem_ticketTierId_fkey';                        -- ON DELETE SET NULL
