import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { extractPagesFromPDF } from "@summa/slides";
import { embedTexts } from "@summa/embeddings";
import { createDeck, listDecksByLecture, getDeck } from "./db_slides.js";
import { ApiResponse } from "@summa/shared";

export async function registerSlidesRoutes(app: FastifyInstance) {

  // Upload PDF and extract text + embeddings -> create Deck
  app.post("/slides/upload", async (req, reply) => {
    const mp = await req.file();
    if (!mp) return reply.code(400).send({ ok:false, error:"missing file" });

    const getLectureIdField = mp.fields.lectureId;
    const lectureIdValue = Array.isArray(getLectureIdField) ? getLectureIdField[0] : getLectureIdField;
    const lectureId = (lectureIdValue && typeof lectureIdValue === 'object' && 'value' in lectureIdValue ? String(lectureIdValue.value) : "") || "";

    const getTitleField = mp.fields.title;
    const titleValue = Array.isArray(getTitleField) ? getTitleField[0] : getTitleField;
    const title = (titleValue && typeof titleValue === 'object' && 'value' in titleValue ? String(titleValue.value) : mp.filename) || "Slides";

    if (!lectureId) return reply.code(400).send({ ok:false, error:"missing lectureId" });

    const uploadDir = path.join(process.cwd(), "uploads", "slides");
    fs.mkdirSync(uploadDir, { recursive: true });
    const fpath = path.join(uploadDir, `${Date.now()}_${mp.filename}`);
    await fs.promises.writeFile(fpath, await mp.toBuffer());

    // Use text-only extraction (Vision API temporarily disabled)
    console.log("[Slides Upload] Using text-only extraction...");
    const pages = await extractPagesFromPDF(fpath);

    // Trim text to 4000 chars per page
    const trimmed = pages.map((p: any) => ({
      page: p.page,
      text: (p.text ?? "").slice(0, 4000)
    }));

    const vectors = await embedTexts(trimmed.map((p: any) => p.text));

    const deck = createDeck(lectureId, title, trimmed.map((p, i) => ({
      page: p.page,
      text: p.text,
      vector: vectors[i]?.vector ?? []
    })));

    return ApiResponse(deck);
  });

  app.get("/lectures/:id/slides", async (req, reply) => {
    const id = (req.params as any).id as string;
    return ApiResponse(listDecksByLecture(id));
  });

  app.get("/slides/:deckId", async (req, reply) => {
    const deckId = (req.params as any).deckId as string;
    const deck = getDeck(deckId);
    if (!deck) return reply.code(404).send({ ok:false, error:"deck not found" });
    return ApiResponse(deck);
  });
}