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

    // Use actual Whisper segments if available, otherwise fall back to sentence splitting
    let paragraphs: Array<{ id: string; text: string; startMs: number; endMs: number }>;

    if (result.segments && result.segments.length > 0) {
      // Use Whisper's actual timestamps (in seconds, convert to milliseconds)
      paragraphs = result.segments.map((segment) => ({
        id: randomUUID(),
        text: segment.text.trim(),
        startMs: Math.round(segment.start * 1000),
        endMs: Math.round(segment.end * 1000)
      })).filter(p => p.text.length > 0);
    } else {
      // Fallback: Split by Korean and English sentence endings
      // Improved Korean sentence splitting pattern
      const sentencePattern = /([^.!?。]+[.!?。]+|[^.!?。]+$)/g;
      const sentences = result.text.match(sentencePattern) || [result.text];

      const cleanSentences = sentences
        .map((s) => s.trim())
        .filter(Boolean);

      if (cleanSentences.length === 0) {
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

      // Estimate timestamps based on text length
      let currentTime = 0;
      paragraphs = cleanSentences.map((sentence) => {
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
    }

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
  },
  settings: {
    backoffStrategies: {
      exponential: (attemptsMade: number) => {
        // Exponential backoff: 2^attemptsMade seconds, max 30 seconds
        return Math.min(1000 * Math.pow(2, attemptsMade), 30000);
      }
    },
    backoffStrategy: (attemptsMade: number) => {
      // Custom backoff: 1s, 2s, 5s, 10s, 30s
      const delays = [1000, 2000, 5000, 10000, 30000];
      return delays[Math.min(attemptsMade - 1, delays.length - 1)];
    }
  }
});

transcribeWorker.on("completed", (job) => {
  console.log(`✅ Transcribe job ${job.id} completed`);
});

transcribeWorker.on("failed", async (job, err) => {
  if (!job) {
    console.error(`❌ Transcribe job failed with no job data:`, err.message);
    return;
  }

  const attemptsMade = job.attemptsMade || 0;
  const maxAttempts = 3;

  console.error(`❌ Transcribe job ${job.id} failed (attempt ${attemptsMade}/${maxAttempts}):`, err.message);

  // If all retries exhausted, update session status to error
  if (attemptsMade >= maxAttempts) {
    console.error(`💀 Transcribe job ${job.id} permanently failed after ${maxAttempts} attempts`);

    try {
      const { sessionId } = job.data;
      if (sessionId) {
        // Import prisma dynamically to avoid circular dependencies
        const { prisma } = await import('./db.js');
        await prisma.session.update({
          where: { id: sessionId },
          data: { status: 'error' }
        });
        console.log(`📝 Updated session ${sessionId} status to 'error'`);
      }
    } catch (updateError) {
      console.error(`Failed to update session status:`, updateError);
    }
  } else {
    console.log(`🔄 Job ${job.id} will be retried (${maxAttempts - attemptsMade} attempts remaining)`);
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
      }`
    );

    await job.updateProgress(10);

    // Call the summarize endpoint internally
    const response = await fetch(
      `${API_BASE_URL}/sessions/${sessionId}/summarize`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to generate summary (${response.status}): ${errorText}`
      );
    }

    await job.updateProgress(100);

    const result = await response.json();
    console.log(`✅ Summary generated for session ${sessionId}`);

    return { ok: true, summary: result };
  } catch (error) {
    console.error(`Summarize job ${job.id} failed:`, error);
    throw error;
  }
}

const summarizeWorker = new Worker("summarize", handleSummarize, {
  connection,
  concurrency: CONSTANTS.SUMMARIZE_CONCURRENCY,
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      // Custom backoff for summarize: 2s, 5s, 10s, 20s, 60s
      const delays = [2000, 5000, 10000, 20000, 60000];
      return delays[Math.min(attemptsMade - 1, delays.length - 1)];
    }
  }
});

summarizeWorker.on("completed", (job) => {
  console.log(`✅ Summarize job ${job.id} completed`);
});

summarizeWorker.on("failed", async (job, err) => {
  if (!job) {
    console.error(`❌ Summarize job failed with no job data:`, err.message);
    return;
  }

  const attemptsMade = job.attemptsMade || 0;
  const maxAttempts = 3;

  console.error(`❌ Summarize job ${job.id} failed (attempt ${attemptsMade}/${maxAttempts}):`, err.message);

  if (attemptsMade >= maxAttempts) {
    console.error(`💀 Summarize job ${job.id} permanently failed after ${maxAttempts} attempts`);
  } else {
    console.log(`🔄 Job ${job.id} will be retried (${maxAttempts - attemptsMade} attempts remaining)`);
  }
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
