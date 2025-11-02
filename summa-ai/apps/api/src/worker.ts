import { Worker, Job } from "bullmq";
import fs from "node:fs";
import { getSTTAdapter } from "@summa/stt";
import { randomUUID } from "crypto";
import { TranscribeJobSchema, SummarizeJobSchema } from "@summa/shared";
import { config, CONSTANTS } from "./config.js";
import { createRedisConnection } from "./redis.js";

console.log("🔧 Starting Summa AI Worker...");

const connection = createRedisConnection({
  maxRetriesPerRequest: null
});

const API_BASE_URL =
  config.API_INTERNAL_URL ??
  config.API_URL ??
  `http://127.0.0.1:${config.PORT}`;

console.log(`📡 API Base URL: ${API_BASE_URL}`);

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
      const duration = Math.max(
        CONSTANTS.MIN_SENTENCE_DURATION,
        sentence.length * CONSTANTS.CHAR_TO_MS_RATIO
      );
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

const transcribeWorker = new Worker("transcribe", handleTranscribe, {
  connection,
  concurrency: CONSTANTS.TRANSCRIBE_CONCURRENCY,
  limiter: {
    max: CONSTANTS.TRANSCRIBE_RATE_LIMIT_MAX,
    duration: CONSTANTS.TRANSCRIBE_RATE_LIMIT_DURATION
  }
});

transcribeWorker.on("completed", (job) => {
  console.log(`✅ Transcribe job ${job.id} completed`);
});

transcribeWorker.on("failed", (job, err) => {
  console.error(`❌ Transcribe job ${job?.id} failed:`, err.message);
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

const summarizeWorker = new Worker("summarize", handleSummarize, {
  connection,
  concurrency: CONSTANTS.SUMMARIZE_CONCURRENCY
});

summarizeWorker.on("completed", (job) => {
  console.log(`✅ Summarize job ${job.id} completed`);
});

summarizeWorker.on("failed", (job, err) => {
  console.error(`❌ Summarize job ${job?.id} failed:`, err.message);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down workers...`);

  try {
    await transcribeWorker.close();
    await summarizeWorker.close();
    await connection.quit();
    console.log("✅ Workers shut down gracefully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during worker shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

console.log("\n✅ Workers running:");
console.log(`  - transcribe: Concurrency ${CONSTANTS.TRANSCRIBE_CONCURRENCY}, Rate limit ${CONSTANTS.TRANSCRIBE_RATE_LIMIT_MAX}/${CONSTANTS.TRANSCRIBE_RATE_LIMIT_DURATION}ms`);
console.log(`  - summarize: Concurrency ${CONSTANTS.SUMMARIZE_CONCURRENCY} (placeholder)\n`);
