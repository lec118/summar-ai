type PageText = {
    page: number;
    text: string;
};
declare function extractPagesFromPDF(filePath: string): Promise<PageText[]>;

export { type PageText, extractPagesFromPDF };
