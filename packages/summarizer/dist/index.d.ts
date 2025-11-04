type EvidenceNote = {
    page: number;
    deckId: string;
    paraId?: string;
    quote?: string;
};
type SummarizeInput = {
    sessionId: string;
    deckId: string;
    paragraphs: {
        id: string;
        text: string;
        startMs?: number;
        endMs?: number;
    }[];
    slides: {
        deckId: string;
        page: number;
        text: string;
    }[];
    alignments: {
        paraId: string;
        slidePage: number;
        deckId: string;
        score: number;
    }[];
    coverage: number;
    avgAlignScore: number;
};
type SummarizeOutput = {
    items: {
        id: string;
        level: "segment" | "overall";
        text: string;
        evidence_ids: string[];
        score: number;
        startMs?: number;
        endMs?: number;
    }[];
};

declare function summarizeWithEvidence(input: SummarizeInput): Promise<SummarizeOutput>;

export { type EvidenceNote, type SummarizeInput, type SummarizeOutput, summarizeWithEvidence };
