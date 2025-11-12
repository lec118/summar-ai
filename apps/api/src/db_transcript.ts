import type { TranscriptParagraph } from "@summa/shared";
import { TranscriptParagraphSchema } from "@summa/shared";
import { z } from "zod";
import { prisma } from "./db.js";

export type AlignmentRecord = {
  paraId: string;
  slidePage: number;
  deckId: string;
  score: number;
};

/**
 * Save paragraphs to database (replaces existing)
 */
export async function saveParagraphs(sessionId: string, items: TranscriptParagraph[]): Promise<void> {
  // Delete existing paragraphs for this session
  await prisma.transcriptParagraph.deleteMany({
    where: { sessionId }
  });

  // Insert new paragraphs
  if (items.length > 0) {
    await prisma.transcriptParagraph.createMany({
      data: items.map(item => ({
        id: item.id,
        sessionId,
        text: item.text,
        startMs: item.startMs,
        endMs: item.endMs,
        createdAt: BigInt(Date.now())
      }))
    });
  }
}

/**
 * Append a single paragraph to database
 */
export async function appendParagraph(sessionId: string, item: TranscriptParagraph): Promise<void> {
  await prisma.transcriptParagraph.create({
    data: {
      id: item.id,
      sessionId,
      text: item.text,
      startMs: item.startMs,
      endMs: item.endMs,
      createdAt: BigInt(Date.now())
    }
  });
}

/**
 * Get all paragraphs for a session from database
 */
export async function getParagraphs(sessionId: string): Promise<TranscriptParagraph[]> {
  const paragraphs = await prisma.transcriptParagraph.findMany({
    where: { sessionId },
    orderBy: { startMs: "asc" }
  });

  return paragraphs.map(p => ({
    id: p.id,
    text: p.text,
    startMs: p.startMs,
    endMs: p.endMs
  }));
}

/**
 * Save alignments to database (replaces existing)
 */
export async function saveAlignments(sessionId: string, items: AlignmentRecord[]): Promise<void> {
  // Delete existing alignments for this session
  await prisma.alignment.deleteMany({
    where: { sessionId }
  });

  // Insert new alignments
  if (items.length > 0) {
    await prisma.alignment.createMany({
      data: items.map(item => ({
        sessionId,
        paraId: item.paraId,
        slidePage: item.slidePage,
        deckId: item.deckId,
        score: item.score,
        createdAt: BigInt(Date.now())
      }))
    });
  }
}

/**
 * Get all alignments for a session from database
 */
export async function getAlignments(sessionId: string): Promise<AlignmentRecord[]> {
  const alignments = await prisma.alignment.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" }
  });

  return alignments.map(a => ({
    paraId: a.paraId,
    slidePage: a.slidePage,
    deckId: a.deckId,
    score: a.score
  }));
}

export const ParagraphSchema = TranscriptParagraphSchema;

export const AlignmentSchema = z.object({
  paraId: z.string(),
  slidePage: z.number().int().min(1),
  deckId: z.string(),
  score: z.number().min(0).max(1)
});

/**
 * Append multiple paragraphs to database
 */
export async function appendParagraphs(sessionId: string, items: TranscriptParagraph[]): Promise<void> {
  if (items.length === 0) return;

  await prisma.transcriptParagraph.createMany({
    data: items.map(item => ({
      id: item.id,
      sessionId,
      text: item.text,
      startMs: item.startMs,
      endMs: item.endMs,
      createdAt: BigInt(Date.now())
    }))
  });
}
