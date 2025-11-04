import { STTAdapter, STTResult } from "./types.js";
import { fileFromPath } from "formdata-node/file-from-path";
import { FormData } from "formdata-node";
import fetch from "node-fetch";

export class OpenAIWhisperAdapter implements STTAdapter {
  async transcribeFile({ filePath, language, prompt }: { filePath: string; language?: string; prompt?: string; }): Promise<STTResult> {
    const apiKey = process.env.OPENAI_API_KEY!;
    const model = process.env.OPENAI_STT_MODEL ?? "whisper-1";
    const fd = new FormData();
    fd.set("file", await fileFromPath(filePath));
    fd.set("model", model);
    if (language) fd.set("language", language);
    if (prompt) fd.set("prompt", prompt);

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd as any
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenAI STT error: ${res.status} ${t}`);
    }

    const data = (await res.json()) as { text?: string; language?: string };
    return {
      text: data.text ?? "",
      language: data.language,
      confidence: undefined
    };
  }
}
