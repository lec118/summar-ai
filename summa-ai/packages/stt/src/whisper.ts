import { STTAdapter, STTResult } from "./types.js";
/**
 * ���� Whisper(��: faster-whisper ����) ���Ͻ� ����
 * env:
 *  - WHISPER_ENDPOINT (e.g., http://localhost:9000/transcribe)
 */
export class LocalWhisperAdapter implements STTAdapter {
  async transcribeFile({ filePath, language, prompt }: { filePath: string; language?: string; prompt?: string; }): Promise<STTResult> {
    const url = process.env.WHISPER_ENDPOINT ?? "http://localhost:9000/transcribe";
    // ���� ���������� ������ multipart�� ����.
    // POC���� ��θ� �����ϰ� ������ ���� �������� �д� ������ ����.
    const res = await fetch(`${url}?path=${encodeURIComponent(filePath)}&lang=${language ?? ""}&prompt=${encodeURIComponent(prompt ?? "")}`);
    if (!res.ok) throw new Error(`Local Whisper error: ${res.statusText}`);
    const data = await res.json();
    return data as STTResult;
  }
}