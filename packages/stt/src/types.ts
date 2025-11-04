export type STTResult = {
  text: string;
  words?: { startMs: number; endMs: number; word: string }[];
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