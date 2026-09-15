-- AlterEnum
BEGIN;
CREATE TYPE "GameType_new" AS ENUM ('PAIRS');
ALTER TABLE "GameSession" ALTER COLUMN "gameType" TYPE "GameType_new" USING ("gameType"::text::"GameType_new");
ALTER TYPE "GameType" RENAME TO "GameType_old";
ALTER TYPE "GameType_new" RENAME TO "GameType";
DROP TYPE "GameType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Concept" DROP CONSTRAINT "Concept_resourceId_fkey";

-- DropForeignKey
ALTER TABLE "Extension" DROP CONSTRAINT "Extension_conceptId_fkey";

-- DropTable
DROP TABLE "Concept";

-- DropTable
DROP TABLE "Extension";

-- CreateTable
CREATE TABLE "PairAttempt" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PairAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PairAttempt_gameSessionId_idx" ON "PairAttempt"("gameSessionId");

-- CreateIndex
CREATE INDEX "PairAttempt_pairId_idx" ON "PairAttempt"("pairId");

-- AddForeignKey
ALTER TABLE "PairAttempt" ADD CONSTRAINT "PairAttempt_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairAttempt" ADD CONSTRAINT "PairAttempt_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "Pair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

