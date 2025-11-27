import type { FastifyInstance } from "fastify";
import { ApiResponse, SummaryItem as SummaryItemSchema } from "@summa/shared";
import type { SummaryReport as SummaryReportType } from "@summa/shared";
import { findSessionById } from "./db.js";
import { listDecksByLecture } from "./db_slides.js";
import { getParagraphs, getAlignments } from "./db_transcript.js";
import { summarizeWithEvidence } from "@summa/summarizer";
import { saveSummary, getSummary } from "./db_summary.js";

interface SessionParams {
  sid: string;
}

export async function registerSummaryRoutes(app: FastifyInstance) {
  app.post<{ Params: SessionParams }>("/sessions/:sid/summarize", async (req, reply) => {
    const { sid } = req.params;

    const context = await findSessionById(sid);
    if (!context) return reply.code(404).send({ ok: false, error: "session not found" });
    const { lectureId } = context;

    const paragraphs = await getParagraphs(sid);
    if (paragraphs.length === 0) return reply.code(400).send({ ok: false, error: "no transcript paragraphs" });

    // Check if slides exist (optional)
    const decks = listDecksByLecture(lectureId);
    const hasSlides = decks.length > 0;
    const deck = hasSlides ? decks[decks.length - 1] : null;

    let input, report: SummaryReportType;

    if (hasSlides && deck) {
      // With slides: advanced summary with evidence
      const alignments = await getAlignments(sid);
      const coverage = Number((alignments.length / Math.max(1, paragraphs.length)).toFixed(4));
      const avgAlignScore = alignments.length === 0
        ? 0
        : Number((alignments.reduce((acc, cur) => acc + cur.score, 0) / alignments.length).toFixed(4));

      input = {
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

      report = {
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
    } else {
      // Without slides: basic summary from transcript only
      input = {
        sessionId: sid,
        deckId: "no-slides",
        paragraphs: paragraphs.map(p => ({ id: p.id, text: p.text, startMs: p.startMs, endMs: p.endMs })),
        slides: [],
        alignments: [],
        coverage: 0,
        avgAlignScore: 0
      };

      const summarized = await summarizeWithEvidence(input);

      report = {
        sessionId: sid,
        deckId: "no-slides",
        items: summarized.items.map(item => SummaryItemSchema.parse(item)),
        metrics: {
          coverage: 0,
          avgAlignScore: 0,
          evidenceCoverage: 0,
          hallucinationRate: 1
        },
        createdAt: Date.now()
      };
    }

    await saveSummary(report);
    return ApiResponse(report);
  });

  app.get("/sessions/:sid/summary", async (req) => {
    const sid = (req.params as any).sid as string;
    const report = await getSummary(sid);
    return report ? ApiResponse(report) : { ok: false, error: "no summary" };
  });
}