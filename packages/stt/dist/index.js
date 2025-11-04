// src/openai.js
import { fileFromPath } from "formdata-node/file-from-path";
import { FormData } from "formdata-node";
import fetch2 from "node-fetch";
var OpenAIWhisperAdapter = class {
  async transcribeFile({ filePath, language, prompt }) {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_STT_MODEL ?? "whisper-1";
    const fd = new FormData();
    fd.set("file", await fileFromPath(filePath));
    fd.set("model", model);
    if (language)
      fd.set("language", language);
    if (prompt)
      fd.set("prompt", prompt);
    const res = await fetch2("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenAI STT error: ${res.status} ${t}`);
    }
    const data = await res.json();
    return {
      text: data.text ?? "",
      language: data.language,
      confidence: void 0
    };
  }
};

// src/whisper.js
var LocalWhisperAdapter = class {
  async transcribeFile({ filePath, language, prompt }) {
    const url = process.env.WHISPER_ENDPOINT ?? "http://localhost:9000/transcribe";
    const res = await fetch(`${url}?path=${encodeURIComponent(filePath)}&lang=${language ?? ""}&prompt=${encodeURIComponent(prompt ?? "")}`);
    if (!res.ok)
      throw new Error(`Local Whisper error: ${res.statusText}`);
    const data = await res.json();
    return data;
  }
};

// src/index.ts
function getSTTAdapter() {
  const provider = (process.env.STT_PROVIDER ?? "openai").toLowerCase();
  if (provider === "whisper") return new LocalWhisperAdapter();
  return new OpenAIWhisperAdapter();
}
export {
  getSTTAdapter
};
