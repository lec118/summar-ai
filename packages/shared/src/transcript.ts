import { z } from "zod";

export const TranscriptParagraphSchema = z.object({
  id: z.string(),
  text: z.string(),
  startMs: z.number().int().nonnegative().optional(),
  endMs: z.number().int().nonnegative().optional()
});

export type TranscriptParagraph = z.infer<typeof TranscriptParagraphSchema>;

export const TranscriptionResultSchema = z.object({
  segmentId: z.string().uuid(),
  lectureId: z.string().uuid().optional(),
  paragraphs: z.array(TranscriptParagraphSchema)
});

export type TranscriptionResultPayload = z.infer<typeof TranscriptionResultSchema>;
