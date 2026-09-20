-- CreateTable
CREATE TABLE "AiRateLimit" (
    "ip" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiRateLimit_pkey" PRIMARY KEY ("ip")
);

