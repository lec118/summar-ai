export type SessionStatus = "idle" | "recording" | "uploaded" | "processing" | "completed" | "error";

export type Session = {
  id: string;
  lectureId: string;
  idx: number;
  mode: "manual" | "auto";
  policy: { lengthMin: number; overlapSec: number; vadPause: boolean };
  status: SessionStatus;
};

export type Segment = {
  id: string;
  sessionId: string;
  localPath?: string;
  createdAt: number;
};

export type TranscriptParagraph = {
  id: string;
  text: string;
  startMs?: number;
  endMs?: number;
};

export type SummaryItem = {
  id: string;
  level: "segment" | "overall";
  text: string;
  evidence_ids: string[];
  score: number;
  startMs?: number;
  endMs?: number;
};

export type SummaryReport = {
  sessionId: string;
  deckId: string;
  items: SummaryItem[];
  metrics: {
    coverage: number;
    avgAlignScore: number;
    evidenceCoverage: number;
    hallucinationRate: number;
  };
  createdAt: number;
};
