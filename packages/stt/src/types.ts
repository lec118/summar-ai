export type STTSegment = {
  id: number;
  start: number;  // seconds
  end: number;    // seconds
  text: string;
};

export type STTResult = {
  text: string;
  words?: { startMs: number; endMs: number; word: string }[];
  segments?: STTSegment[];
  language?: string;
  confidence?: number;
};

export interface STTAdapter {
  transcribeFile(params: {
    filePath: string;
    language?: string;
    prompt?: string;
  }): Promise<STTResult>;
}