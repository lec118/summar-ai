-- CreateTable
CREATE TABLE "transcript_paragraphs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "transcript_paragraphs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alignments" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "paraId" TEXT NOT NULL,
    "slidePage" INTEGER NOT NULL,
    "deckId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "alignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transcript_paragraphs_sessionId_idx" ON "transcript_paragraphs"("sessionId");

-- CreateIndex
CREATE INDEX "alignments_sessionId_idx" ON "alignments"("sessionId");

-- CreateIndex
CREATE INDEX "alignments_paraId_idx" ON "alignments"("paraId");

-- AddForeignKey
ALTER TABLE "transcript_paragraphs" ADD CONSTRAINT "transcript_paragraphs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
