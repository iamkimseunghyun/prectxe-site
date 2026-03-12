-- Remove foreign key constraints linking tickets to programs
ALTER TABLE "TicketTier" DROP CONSTRAINT IF EXISTS "TicketTier_programId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_programId_fkey";

-- Drop programId columns from TicketTier and Order
ALTER TABLE "TicketTier" DROP COLUMN IF EXISTS "programId";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "programId";

-- Remove ticketingEnabled from Program
ALTER TABLE "Program" DROP COLUMN IF EXISTS "ticketingEnabled";
