export type EvidenceNote = { page: number; deckId: string; paraId?: string; quote?: string };
export type SummarizeInput = {
  sessionId: string;
  deckId: string;
  paragraphs: { id: string; text: string; startMs?: number; endMs?: number }[];
  slides: { deckId: string; page: number; text: string }[];
  alignments: { paraId: string; slidePage: number; deckId: string; score: number }[];
  coverage: number;
  avgAlignScore: number;
};
export type SummarizeOutput = {
  items: { id: string; level: "segment"|"overall"; text: string; evidence_ids: string[]; score: number; startMs?: number; endMs?: number }[];
};