import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiResponse } from "@summa/shared";
import {
  AlignmentSchema,
  ParagraphSchema,
  getAlignments,
  getParagraphs,
  saveAlignments,
  saveParagraphs
} from "./db_transcript";

const AlignPayload = z.object({
  paragraphs: z.array(ParagraphSchema).default([]),
  alignments: z.array(AlignmentSchema).default([])
});

export async function registerAlignRoutes(app: FastifyInstance) {
  app.post("/sessions/:sid/align", async (req, reply) => {
    const sid = (req.params as any).sid as string;
    const body = AlignPayload.safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ ok: false, error: body.error });
    saveParagraphs(sid, body.data.paragraphs);
    saveAlignments(sid, body.data.alignments);
    return ApiResponse({ paragraphs: body.data.paragraphs.length, alignments: body.data.alignments.length });
  });

  app.get("/sessions/:sid/align", async (req) => {
    const sid = (req.params as any).sid as string;
    return ApiResponse({
      paragraphs: getParagraphs(sid),
      alignments: getAlignments(sid)
    });
  });
}