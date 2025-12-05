import { STTAdapter, STTResult } from "./types.js";
import { fileFromPath } from "formdata-node/file-from-path";
import { FormData } from "formdata-node";
import fetch from "node-fetch";
import { splitAudioFile, cleanupChunks } from "./audioSplitter.js";
import fs from "node:fs";

const MAX_FILE_SIZE_MB = 24; // OpenAI limit is 25MB, use 24MB to be safe
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export class OpenAIWhisperAdapter implements STTAdapter {
  async transcribeFile({ filePath, language, prompt }: { filePath: string; language?: string; prompt?: string; }): Promise<STTResult> {
    const fileStats = fs.statSync(filePath);
    const fileSizeBytes = fileStats.size;

    // If file is small enough, process normally
    if (fileSizeBytes <= MAX_FILE_SIZE_BYTES) {
      console.log(`📝 File size ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB - processing normally`);
      return this.transcribeSingleFile(filePath, language, prompt);
    }

    // File is too large, split and process in chunks
    console.log(`⚠️  File size ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB exceeds OpenAI limit`);
    console.log(`🔪 Splitting file into chunks...`);

    const chunks = await splitAudioFile(filePath);
    console.log(`✅ Split into ${chunks.length} chunks`);

    const results: STTResult[] = [];
    let totalDuration = 0;
    const failedChunks: number[] = [];

    // Process each chunk with retry logic
    for (const chunk of chunks) {
      console.log(`📝 Processing chunk ${chunk.index + 1}/${chunks.length}`);

      let success = false;
      let lastError: Error | null = null;
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await this.transcribeSingleFile(chunk.path, language, prompt);
          results.push(result);
          totalDuration += chunk.duration;
          success = true;
          break;
        } catch (error) {
          lastError = error as Error;
          console.error(`❌ Chunk ${chunk.index + 1} failed (attempt ${attempt}/${maxRetries}):`, error);

          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`⏳ Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      if (!success) {
        console.error(`💥 Chunk ${chunk.index + 1} failed after ${maxRetries} attempts. Using empty transcription.`);
        failedChunks.push(chunk.index);

        // Add empty result for failed chunk to maintain alignment
        results.push({
          text: "",
          language: undefined,
          confidence: undefined,
          segments: []
        });
        totalDuration += chunk.duration;
      }
    }

    if (failedChunks.length > 0) {
      console.warn(`⚠️  Warning: ${failedChunks.length} chunk(s) failed to transcribe: ${failedChunks.map(i => i + 1).join(', ')}`);
    }

    // Clean up chunk files
    await cleanupChunks(chunks, filePath);

    // Merge results
    console.log(`🔗 Merging ${results.length} transcription results`);
    return this.mergeResults(results, totalDuration);
  }

  private async transcribeSingleFile(filePath: string, language?: string, prompt?: string): Promise<STTResult> {
    const apiKey = process.env.OPENAI_API_KEY!;
    const model = process.env.OPENAI_STT_MODEL ?? "whisper-1";
    const fd = new FormData();
    fd.set("file", await fileFromPath(filePath));
    fd.set("model", model);
    fd.set("response_format", "verbose_json");  // Get detailed timestamps
    fd.set("timestamp_granularities[]", "segment");  // Get segment-level timestamps
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

    const data = (await res.json()) as {
      text?: string;
      language?: string;
      segments?: Array<{
        id: number;
        seek: number;
        start: number;
        end: number;
        text: string;
        tokens: number[];
        temperature: number;
        avg_logprob: number;
        compression_ratio: number;
        no_speech_prob: number;
      }>;
    };

    return {
      text: data.text ?? "",
      language: data.language,
      confidence: undefined,
      segments: data.segments
    };
  }

  private mergeResults(results: STTResult[], totalDuration: number): STTResult {
    // Merge all text
    const mergedText = results.map(r => r.text).join(' ').trim();

    // Merge segments with adjusted timestamps
    const mergedSegments: any[] = [];
    let timeOffset = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.segments) {
        for (const segment of result.segments) {
          mergedSegments.push({
            ...segment,
            id: mergedSegments.length,
            start: segment.start + timeOffset,
            end: segment.end + timeOffset
          });
        }
        // Calculate time offset for next chunk based on last segment's end time
        const lastSegment = result.segments[result.segments.length - 1];
        if (lastSegment) {
          timeOffset = lastSegment.end + timeOffset;
        }
      }
    }

    return {
      text: mergedText,
      language: results[0]?.language,
      confidence: undefined,
      segments: mergedSegments.length > 0 ? mergedSegments : undefined
    };
  }
}
