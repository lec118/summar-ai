type STTResult = {
    text: string;
    words?: {
        startMs: number;
        endMs: number;
        word: string;
    }[];
    language?: string;
    confidence?: number;
};
interface STTAdapter {
    transcribeFile(params: {
        filePath: string;
        language?: string;
        prompt?: string;
    }): Promise<STTResult>;
}

declare function getSTTAdapter(): STTAdapter;

export { type STTAdapter, type STTResult, getSTTAdapter };
