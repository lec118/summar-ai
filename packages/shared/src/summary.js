import { z } from "zod";
export const SummaryItem = z.object({
    id: z.string(),
    level: z.enum(["segment", "overall"]).default("segment"),
    text: z.string(),
    evidence_ids: z.array(z.string()).default([]),
    score: z.number().min(0).max(1).default(0),
    startMs: z.number().int().nonnegative().optional(),
    endMs: z.number().int().nonnegative().optional()
});
export const SummaryReport = z.object({
    sessionId: z.string(),
    deckId: z.string(),
    items: z.array(SummaryItem),
    metrics: z.object({
        coverage: z.number().min(0).max(1),
        avgAlignScore: z.number().min(0).max(1),
        evidenceCoverage: z.number().min(0).max(1),
        hallucinationRate: z.number().min(0).max(1)
    }),
    createdAt: z.number()
});
