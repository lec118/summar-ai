import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import fs from "node:fs";
import { getSTTAdapter } from "@summa/stt";
import { mem } from "./db.js";
import { appendParagraph } from "./db_transcript.js";
import { randomUUID } from "crypto";
import { TranscribeJobSchema, SummarizeJobSchema } from "@summa/shared";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

async function handleTranscribe(job: Job) {
  try {
    // Validate job data
    const validation = TranscribeJobSchema.safeParse(job.data);
    if (!validation.success) {
      console.error("❌ Invalid transcribe job data:", validation.error);
      throw new Error(`Invalid job data: ${validation.error.message}`);
    }

    const { segmentId, sessionId, lectureId } = validation.data;

    // Get segment file
    const seg = (mem.segments.get(sessionId) ?? []).find(s => s.id === segmentId);
    if (!seg?.localPath) {
      throw new Error(`Segment ${segmentId} not found in session ${sessionId}`);
    }

    if (!fs.existsSync(seg.localPath)) {
      throw new Error(`Segment file not found: ${seg.localPath}`);
    }

    await job.updateProgress(5);

    // Transcribe audio file
    const adapter = getSTTAdapter();
    const result = await adapter.transcribeFile({ filePath: seg.localPath });

    if (!result?.text) {
      throw new Error("STT adapter returned empty result");
    }

    await job.updateProgress(50);

    // Split text into sentences (simple approach)
    const sentences = result.text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (sentences.length === 0) {
      console.warn(`⚠️ No sentences extracted from transcription for segment ${segmentId}`);
      return { ok: true, textLen: result.text.length, paragraphs: 0 };
    }

    // Save each sentence as a paragraph
    let currentTime = 0;
    for (const sentence of sentences) {
      const paraId = randomUUID();
      const duration = Math.max(2000, sentence.length * 50); // Rough estimate: 50ms per character
      appendParagraph(sessionId, {
        id: paraId,
        text: sentence,
        startMs: currentTime,
        endMs: currentTime + duration
      });
      currentTime += duration;
    }

    console.log(`✅ STT [${lectureId}/${sessionId}/${segmentId}]: ${result.text.slice(0, 120)}... (${sentences.length} paragraphs)`);
    await job.updateProgress(100);

    return { ok: true, textLen: result.text.length, paragraphs: sentences.length };
  } catch (error) {
    console.error(`❌ Transcribe job ${job.id} failed:`, error);
    throw error; // BullMQ will handle retry logic
  }
}

// Create transcribe worker with retry configuration
new Worker("transcribe", handleTranscribe, {
  connection,
  concurrency: 5, // Process up to 5 jobs concurrently
  limiter: {
    max: 10, // Max 10 jobs
    duration: 60000 // per 60 seconds
  }
});

async function handleSummarize(job: Job) {
  try {
    // Validate job data
    const validation = SummarizeJobSchema.safeParse(job.data);
    if (!validation.success) {
      console.error("❌ Invalid summarize job data:", validation.error);
      throw new Error(`Invalid job data: ${validation.error.message}`);
    }

    const { sessionId, deckId } = validation.data;

    // TODO: Implement Evidence RAG + summarize
    console.log(`📝 Summarize job for session ${sessionId}${deckId ? ` with deck ${deckId}` : ''} - NOT YET IMPLEMENTED`);

    await new Promise(r => setTimeout(r, 100));
    return { ok: true, status: "placeholder" };
  } catch (error) {
    console.error(`❌ Summarize job ${job.id} failed:`, error);
    throw error;
  }
}

new Worker("summarize", handleSummarize, {
  connection,
  concurrency: 3
});

console.log("👷 Workers running:");
console.log("  - transcribe: Uses STT adapter with retry logic");
console.log("  - summarize: Placeholder (TODO: Evidence RAG + summarize)");
