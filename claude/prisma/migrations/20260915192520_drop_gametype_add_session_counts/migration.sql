-- AlterTable
ALTER TABLE "GameSession" DROP COLUMN "gameType",
ADD COLUMN     "correctCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "incorrectCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PairAttempt" DROP COLUMN "correct";

-- DropEnum
DROP TYPE "GameType";

