import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { extractPagesFromPDF, extractPagesWithVision } from "@summa/slides";
import { embedTexts } from "@summa/embeddings";
import { createDeck, listDecksByLecture, getDeck } from "./db_slides";
import { ApiResponse } from "@summa/shared";

export async function registerSlidesRoutes(app: FastifyInstance) {

  // ���ε�: PDF �� ������ �ؽ�Ʈ �� �Ӻ��� �� Deck ����
  app.post("/slides/upload", async (req, reply) => {
    const mp = await req.file();
    if (!mp) return reply.code(400).send({ ok:false, error:"missing file" });

    const lectureId = (mp.fields.lectureId?.value as string) ?? "";
    const title = (mp.fields.title?.value as string) ?? mp.filename ?? "Slides";
    if (!lectureId) return reply.code(400).send({ ok:false, error:"missing lectureId" });

    const uploadDir = path.join(process.cwd(), "uploads", "slides");
    fs.mkdirSync(uploadDir, { recursive: true });
    const fpath = path.join(uploadDir, `${Date.now()}_${mp.filename}`);
    await fs.promises.writeFile(fpath, await mp.toBuffer());

    // Vision API 사용 여부 확인 (환경변수로 제어)
    const useVision = process.env.USE_VISION === "true";

    let pages;
    if (useVision) {
      console.log("[Slides Upload] Using Vision API for enhanced analysis...");
      pages = await extractPagesWithVision(fpath);
    } else {
      console.log("[Slides Upload] Using text-only extraction...");
      pages = await extractPagesFromPDF(fpath);
    }

    // Vision 분석 결과가 있으면 텍스트와 결합
    const trimmed = pages.map(p => {
      let combinedText = p.text ?? "";
      if ('visionAnalysis' in p && p.visionAnalysis) {
        combinedText += `\n\n[Vision 분석]: ${p.visionAnalysis}`;
      }
      return {
        page: p.page,
        text: combinedText.slice(0, 6000)  // Vision 때문에 더 긴 텍스트
      };
    });

    const vectors = await embedTexts(trimmed.map(p => p.text));

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