-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "balanceAppliedCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "balanceCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "event_cancellation_notices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventTitle" TEXT NOT NULL,
    "refundedCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMPTZ(6),

    CONSTRAINT "event_cancellation_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_cancellation_notices_userId_acknowledgedAt_idx" ON "event_cancellation_notices"("userId", "acknowledgedAt");

-- AddForeignKey
ALTER TABLE "event_cancellation_notices" ADD CONSTRAINT "event_cancellation_notices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
