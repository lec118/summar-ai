// src/parser.ts
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "fs";
async function extractPagesFromPDF(filePath) {
  if (!fs.existsSync(filePath)) throw new Error("PDF not found: " + filePath);
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => it.str).join(" ").replace(/\s+\n/g, "\n");
    pages.push({ page: i, text });
  }
  return pages;
}
export {
  extractPagesFromPDF
};
