import { STTAdapter, STTResult } from "./types.js";
/**
 * 로컬 Whisper(예: faster-whisper 서버) 프록시 예시
 * env:
 *  - WHISPER_ENDPOINT (e.g., http://localhost:9000/transcribe)
 */
export class LocalWhisperAdapter implements STTAdapter {
  async transcribeFile({ filePath, language, prompt }: { filePath: string; language?: string; prompt?: string; }): Promise<STTResult> {
    const url = process.env.WHISPER_ENDPOINT ?? "http://localhost:9000/transcribe";
    // 실제 구현에서는 파일을 multipart로 전송.
    // POC에선 경로만 전송하고 서버가 공유 볼륨에서 읽는 것으로 가정.
    const res = await fetch(`${url}?path=${encodeURIComponent(filePath)}&lang=${language ?? ""}&prompt=${encodeURIComponent(prompt ?? "")}`);
    if (!res.ok) throw new Error(`Local Whisper error: ${res.statusText}`);
    const data = await res.json();
    return data as STTResult;
  }
}