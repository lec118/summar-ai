import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import fs from "node:fs";
import { getSTTAdapter } from "@summa/stt";
import { randomUUID } from "crypto";
import { TranscribeJobSchema, SummarizeJobSchema } from "@summa/shared";

const connection = new IORedis(
  process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  { maxRetriesPerRequest: null }
);

const API_BASE_URL =
  process.env.API_INTERNAL_URL ??
  process.env.API_URL ??
  "http://127.0.0.1:4000";

async function sendTranscriptionResult(payload: {
  sessionId: string;
  segmentId: string;
  lectureId?: string;
  paragraphs: Array<{
    id: string;
    text: string;
    startMs: number;
    endMs: number;
  }>;
}) {
  const response = await fetch(
    `${API_BASE_URL}/sessions/${payload.sessionId}/transcription-result`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        segmentId: payload.segmentId,
        lectureId: payload.lectureId,
        paragraphs: payload.paragraphs
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to report transcription result (${response.status}): ${errorText}`
    );
  }
}

async function handleTranscribe(job: Job) {
  try {
    const validation = TranscribeJobSchema.safeParse(job.data);
    if (!validation.success) {
      console.error("Invalid transcribe job data:", validation.error);
      throw new Error(`Invalid job data: ${validation.error.message}`);
    }

    const { segmentId, sessionId, lectureId, localPath } = validation.data;

    if (!fs.existsSync(localPath)) {
      throw new Error(`Segment file not found: ${localPath}`);
    }

    await job.updateProgress(5);

    const adapter = getSTTAdapter();
    const result = await adapter.transcribeFile({ filePath: localPath });

    if (!result?.text) {
      throw new Error("STT adapter returned empty result");
    }

    await job.updateProgress(50);

    const sentences = result.text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    if (sentences.length === 0) {
      console.warn(
        `No sentences extracted from transcription for segment ${segmentId}`
      );
      await sendTranscriptionResult({
        sessionId,
        segmentId,
        lectureId,
        paragraphs: []
      });
      await job.updateProgress(100);
      return { ok: true, textLen: result.text.length, paragraphs: 0 };
    }

    let currentTime = 0;
    const paragraphs = sentences.map((sentence) => {
      const paraId = randomUUID();
      const duration = Math.max(2000, sentence.length * 50);
      const payload = {
        id: paraId,
        text: sentence,
        startMs: currentTime,
        endMs: currentTime + duration
      };
      currentTime += duration;
      return payload;
    });

    console.log(
      `STT [${lectureId}/${sessionId}/${segmentId}]: ${result.text.slice(
        0,
        120
      )}... (${paragraphs.length} paragraphs)`
    );

    await sendTranscriptionResult({
      sessionId,
      segmentId,
      lectureId,
      paragraphs
    });

    await job.updateProgress(100);

    return { ok: true, textLen: result.text.length, paragraphs: paragraphs.length };
  } catch (error) {
    console.error(`Transcribe job ${job.id} failed:`, error);
    throw error;
  }
}

new Worker("transcribe", handleTranscribe, {
  connection,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 60000
  }
});

async function handleSummarize(job: Job) {
  try {
    const validation = SummarizeJobSchema.safeParse(job.data);
    if (!validation.success) {
      console.error("Invalid summarize job data:", validation.error);
      throw new Error(`Invalid job data: ${validation.error.message}`);
    }

    const { sessionId, deckId } = validation.data;

    console.log(
      `Summarize job for session ${sessionId}${
        deckId ? ` with deck ${deckId}` : ""
      } - NOT YET IMPLEMENTED`
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
    return { ok: true, status: "placeholder" };
  } catch (error) {
    console.error(`Summarize job ${job.id} failed:`, error);
    throw error;
  }
}

new Worker("summarize", handleSummarize, {
  connection,
  concurrency: 3
});

console.log("Workers running:");
console.log("  - transcribe: Uses STT adapter with retry logic");
console.log("  - summarize: Placeholder (TODO: Evidence RAG + summarize)");
