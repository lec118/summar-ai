import { z } from "zod";

export const SlidePage = z.object({
  page: z.number().int().min(1),
  text: z.string().default(""),
  vector: z.array(z.number()).default([])
});
export type SlidePage = z.infer<typeof SlidePage>;

export const SlideDeck = z.object({
  id: z.string(),
  lectureId: z.string(),
  title: z.string(),
  pages: z.array(SlidePage),
  createdAt: z.number()
});
export type SlideDeck = z.infer<typeof SlideDeck>;