import { z } from "zod";

export type TranscriptParagraph = {
  id: string;
  text: string;
  startMs?: number;
  endMs?: number;
};

export type AlignmentRecord = {
  paraId: string;
  slidePage: number;
  deckId: string;
  score: number;
};

const paragraphs = new Map<string, TranscriptParagraph[]>();
const alignments = new Map<string, AlignmentRecord[]>();

export function saveParagraphs(sessionId: string, items: TranscriptParagraph[]) {
  paragraphs.set(sessionId, items);
}

export function appendParagraph(sessionId: string, item: TranscriptParagraph) {
  const list = paragraphs.get(sessionId) ?? [];
  list.push(item);
  paragraphs.set(sessionId, list);
}

export function getParagraphs(sessionId: string): TranscriptParagraph[] {
  return [...(paragraphs.get(sessionId) ?? [])];
}

export function saveAlignments(sessionId: string, items: AlignmentRecord[]) {
  alignments.set(sessionId, items);
}

export function getAlignments(sessionId: string): AlignmentRecord[] {
  return [...(alignments.get(sessionId) ?? [])];
}

export const ParagraphSchema = z.object({
  id: z.string(),
  text: z.string(),
  startMs: z.number().int().nonnegative().optional(),
  endMs: z.number().int().nonnegative().optional()
});

export const AlignmentSchema = z.object({
  paraId: z.string(),
  slidePage: z.number().int().min(1),
  deckId: z.string(),
  score: z.number().min(0).max(1)
});