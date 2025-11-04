type EmbeddingResp = {
    vector: number[];
    model: string;
};
declare function embedTexts(texts: string[], model?: string): Promise<EmbeddingResp[]>;

export { type EmbeddingResp, embedTexts };
