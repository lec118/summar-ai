/**
 * PDF 슬라이드를 Vision API로 분석
 * - PDF → 이미지 변환
 * - Vision API로 각 페이지 분석 (텍스트 + 이미지 + 차트)
 */
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "canvas";
import fs from "node:fs";
import fetch from "node-fetch";

export type PageContent = {
  page: number;
  text: string;  // 기존 텍스트
  visionAnalysis: string;  // Vision API 분석 결과
};

interface VisionAnalyzer {
  analyzePage(imageBase64: string): Promise<string>;
}

/**
 * OpenAI GPT-4 Vision
 */
class OpenAIVision implements VisionAnalyzer {
  async analyzePage(imageBase64: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY!;
    const model = process.env.VISION_MODEL ?? "gpt-4o";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: "이 강의 슬라이드를 분석해주세요. 텍스트, 이미지, 차트, 다이어그램 등 모든 시각적 요소를 설명하세요. 한국어로 답변하되, 전문 용어는 원문 유지. 간결하게 핵심만."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageBase64}`
              }
            }
          ]
        }],
        max_tokens: 500,
        temperature: 0.2
      })
    });

    if (!res.ok) throw new Error(`OpenAI Vision error ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    return data.choices[0].message.content;
  }
}

/**
 * Anthropic Claude 3 Vision
 */
class AnthropicVision implements VisionAnalyzer {
  async analyzePage(imageBase64: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY!;
    const model = process.env.VISION_MODEL ?? "claude-3-5-sonnet-20241022";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        temperature: 0.2,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageBase64
              }
            },
            {
              type: "text",
              text: "이 강의 슬라이드를 분석해주세요. 텍스트, 이미지, 차트, 다이어그램 등 모든 시각적 요소를 설명하세요. 한국어로 답변하되, 전문 용어는 원문 유지. 간결하게 핵심만."
            }
          ]
        }]
      })
    });

    if (!res.ok) throw new Error(`Anthropic Vision error ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    return data.content?.[0]?.text ?? "";
  }
}

function getVisionAnalyzer(): VisionAnalyzer {
  const provider = (process.env.VISION_PROVIDER ?? process.env.SUMM_LLM ?? "openai").toLowerCase();
  if (provider === "anthropic") return new AnthropicVision();
  return new OpenAIVision();
}

/**
 * PDF 페이지를 이미지로 렌더링
 */
async function renderPageToImage(page: any): Promise<string> {
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context,
    viewport
  }).promise;

  // Base64로 변환
  const buffer = canvas.toBuffer("image/png");
  return buffer.toString("base64");
}

/**
 * PDF에서 Vision으로 강화된 콘텐츠 추출
 */
export async function extractPagesWithVision(filePath: string): Promise<PageContent[]> {
  if (!fs.existsSync(filePath)) throw new Error("PDF not found: " + filePath);

  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjs.getDocument({ data }).promise;
  const analyzer = getVisionAnalyzer();
  const pages: PageContent[] = [];

  console.log(`[Vision Parser] Processing ${doc.numPages} pages with Vision API...`);

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);

    // 1. 텍스트 추출 (기존 방식)
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => it.str).join(" ").replace(/\s+\n/g, "\n");

    // 2. 이미지로 렌더링
    const imageBase64 = await renderPageToImage(page);

    // 3. Vision API로 분석
    console.log(`[Vision Parser] Analyzing page ${i}/${doc.numPages}...`);
    const visionAnalysis = await analyzer.analyzePage(imageBase64);

    pages.push({ page: i, text, visionAnalysis });

    // Rate limiting 방지 (API 호출 간 딜레이)
    if (i < doc.numPages) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`[Vision Parser] Completed! Analyzed ${pages.length} pages.`);
  return pages;
}
