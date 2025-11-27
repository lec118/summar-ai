-- CreateTable
CREATE TABLE "summaries" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_metrics" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT,
    "sessionId" TEXT,
    "whisperMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gpt4Tokens" INTEGER NOT NULL DEFAULT 0,
    "embeddingTokens" INTEGER NOT NULL DEFAULT 0,
    "whisperCost" INTEGER NOT NULL DEFAULT 0,
    "gpt4Cost" INTEGER NOT NULL DEFAULT 0,
    "embeddingCost" INTEGER NOT NULL DEFAULT 0,
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "usage_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota_limits" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "maxMinutes" INTEGER NOT NULL DEFAULT 180,
    "maxCost" INTEGER NOT NULL DEFAULT 500,
    "usedMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usedCost" INTEGER NOT NULL DEFAULT 0,
    "resetDate" BIGINT NOT NULL,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "quota_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "summaries_sessionId_key" ON "summaries"("sessionId");

-- CreateIndex
CREATE INDEX "summaries_sessionId_idx" ON "summaries"("sessionId");

-- CreateIndex
CREATE INDEX "usage_metrics_lectureId_idx" ON "usage_metrics"("lectureId");

-- CreateIndex
CREATE INDEX "usage_metrics_sessionId_idx" ON "usage_metrics"("sessionId");

-- CreateIndex
CREATE INDEX "usage_metrics_createdAt_idx" ON "usage_metrics"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "quota_limits_userId_key" ON "quota_limits"("userId");
