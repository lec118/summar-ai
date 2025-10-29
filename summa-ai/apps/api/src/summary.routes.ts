import type { FastifyInstance } from "fastify";
import { ApiResponse, SummaryItem as SummaryItemSchema } from "@summa/shared";
import type { SummaryReport as SummaryReportType } from "@summa/shared";
import { mem } from "./db";
import { listDecksByLecture } from "./db_slides";
import { getParagraphs, getAlignments } from "./db_transcript";
import { summarizeWithEvidence } from "@summa/summarizer";
import { saveSummary, getSummary } from "./db_summary";

export async function registerSummaryRoutes(app: FastifyInstance) {
  app.post("/sessions/:sid/summarize", async (req, reply) => {
    const sid = (req.params as any).sid as string;
    let lectureId: string | undefined;
    for (const [lecId, sessions] of mem.sessions.entries()) {
      if (sessions.some(s => s.id === sid)) {
        lectureId = lecId;
        break;
      }
    }
    if (!lectureId) return reply.code(404).send({ ok: false, error: "session not found" });

    const decks = listDecksByLecture(lectureId);
    if (decks.length === 0) return reply.code(400).send({ ok: false, error: "no slides" });
    const deck = decks[decks.length - 1];

    const paragraphs = getParagraphs(sid);
    if (paragraphs.length === 0) return reply.code(400).send({ ok: false, error: "no transcript paragraphs" });

    const alignments = getAlignments(sid);
    const coverage = Number((alignments.length / Math.max(1, paragraphs.length)).toFixed(4));
    const avgAlignScore = alignments.length === 0
      ? 0
      : Number((alignments.reduce((acc, cur) => acc + cur.score, 0) / alignments.length).toFixed(4));

    const input = {
      sessionId: sid,
      deckId: deck.id,
      paragraphs: paragraphs.map(p => ({ id: p.id, text: p.text, startMs: p.startMs, endMs: p.endMs })),
      slides: deck.pages.map(p => ({ deckId: deck.id, page: p.page, text: p.text })),
      alignments: alignments.map(a => ({ paraId: a.paraId, slidePage: a.slidePage, deckId: a.deckId, score: a.score })),
      coverage,
      avgAlignScore
    };

    const summarized = await summarizeWithEvidence(input);
    const evidenceCount = summarized.items.filter(item => (item.evidence_ids?.length ?? 0) > 0).length;
    const evidenceCoverage = summarized.items.length === 0
      ? 0
      : Number((evidenceCount / summarized.items.length).toFixed(4));
    const hallucinationRate = Number((1 - evidenceCoverage).toFixed(4));

    const report: SummaryReportType = {
      sessionId: sid,
      deckId: deck.id,
      items: summarized.items.map(item => SummaryItemSchema.parse(item)),
      metrics: {
        coverage,
        avgAlignScore,
        evidenceCoverage,
        hallucinationRate
      },
      createdAt: Date.now()
    };

    saveSummary(report);
    return ApiResponse(report);
  });

  app.get("/sessions/:sid/summary", async (req) => {
    const sid = (req.params as any).sid as string;
    const report = getSummary(sid);
    return report ? ApiResponse(report) : { ok: false, error: "no summary" };
  });
}