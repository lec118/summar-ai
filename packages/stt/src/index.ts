import { STTAdapter } from "./types.js";
import { OpenAIWhisperAdapter } from "./openai.js";
import { LocalWhisperAdapter } from "./whisper.js";

export * from "./types.js";

export function getSTTAdapter(): STTAdapter {
  const provider = (process.env.STT_PROVIDER ?? "openai").toLowerCase();
  if (provider === "whisper") return new LocalWhisperAdapter();
  return new OpenAIWhisperAdapter();
}