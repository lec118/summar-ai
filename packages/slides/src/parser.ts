/**
 * PDF → 페이지별 텍스트 추출 (Node 환경)
 * - pdfjs-dist 사용
 */
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "node:fs";

export type PageText = { page: number; text: string };

export async function extractPagesFromPDF(filePath: string): Promise<PageText[]> {
  if (!fs.existsSync(filePath)) throw new Error("PDF not found: " + filePath);
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: PageText[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => it.str).join(" ").replace(/\s+\n/g, "\n");
    pages.push({ page: i, text });
  }
  return pages;
}