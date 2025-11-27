import type { SummaryReport } from "@summa/shared";
import { prisma } from "./db.js";

export async function saveSummary(report: SummaryReport): Promise<void> {
  await prisma.summary.upsert({
    where: { sessionId: report.sessionId },
    create: {
      sessionId: report.sessionId,
      deckId: report.deckId,
      items: report.items as any,
      metrics: report.metrics as any,
      createdAt: BigInt(report.createdAt)
    },
    update: {
      deckId: report.deckId,
      items: report.items as any,
      metrics: report.metrics as any,
      createdAt: BigInt(report.createdAt)
    }
  });
}

export async function getSummary(sessionId: string): Promise<SummaryReport | null> {
  const summary = await prisma.summary.findUnique({
    where: { sessionId }
  });

  if (!summary) return null;

  return {
    sessionId: summary.sessionId,
    deckId: summary.deckId,
    items: summary.items as any,
    metrics: summary.metrics as any,
    createdAt: Number(summary.createdAt)
  };
}
