import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import {
  CreateLectureDTO,
  CreateSessionDTO,
  PatchSessionDTO,
  ApiResponse,
  RouteParamsSchemas,
  TranscriptionResultSchema,
  type Session
} from "@summa/shared";
import {
  createLecture,
  createSession,
  getAllLectures,
  getSessionsByLectureId,
  patchSession,
  getSegments,
  deleteSession,
  findSessionById,
  markProcessingJobs,
  resolveProcessingJob,
  prisma
} from "./db.js";
import { registerTus } from "./upload.js";
import { registerSlidesRoutes } from "./slides.routes.js";
import { registerAlignRoutes } from "./align.routes.js";
import { registerSummaryRoutes } from "./summary.routes.js";
import { appendParagraphs, getParagraphs } from "./db_transcript.js";
import { Queue } from "bullmq";
import { config, CONSTANTS } from "./config.js";
import { createRedisConnection, testRedisConnection } from "./redis.js";
import { initializeFileCleanup } from "./fileCleanup.js";

console.log("🚀 Starting Summa AI API...");
console.log(`📝 Environment: ${config.NODE_ENV}`);
console.log(`🔌 Port: ${config.PORT}`);
console.log(`🌐 Allowed origins: ${config.ALLOWED_ORIGINS.join(", ")}`);

const app = Fastify({
  logger: config.NODE_ENV === "development" ? true : {
    level: "info"
  }
});

// Initialize file cleanup cron job
initializeFileCleanup();

// Security headers
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  crossOriginEmbedderPolicy: false  // Required for uploads
});

// Rate limiting
await app.register(rateLimit, {
  max: 100,  // 100 requests
  timeWindow: '15 minutes',
  cache: 10000,  // Cache size
  allowList: (req) => {
    // Allow localhost in development
    return config.NODE_ENV === 'development' &&
           (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === 'localhost');
  },
  errorResponseBuilder: (req, context) => ({
    ok: false,
    error: 'Too many requests. Please try again later.',
    retryAfter: context.after
  }),
  skipOnError: false
});

console.log('🔒 Security middleware registered (helmet + rate limiting)');

// CORS configuration
await app.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      cb(null, true);
      return;
    }

    // Allow if in allowedOrigins list
    if (config.ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true);
      return;
    }

    // Allow all vercel.app domains
    if (origin.endsWith('.vercel.app')) {
      cb(null, true);
      return;
    }

    cb(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
});

await app.register(multipart, {
  limits: {
    fileSize: CONSTANTS.MAX_FILE_SIZE,
    files: CONSTANTS.MAX_FILES_PER_REQUEST
  }
});

// Initialize Redis connection with error handling
console.log("📡 Connecting to Redis...");
const connection = createRedisConnection();

// Test Redis connection before starting queues
const isRedisHealthy = await testRedisConnection(connection);
if (!isRedisHealthy) {
  console.error("❌ Redis connection failed. Server will start but job processing will not work.");
} else {
  console.log("✅ Redis connection established");
}

const transcribeQueue = new Queue("transcribe", { connection });
const summarizeQueue = new Queue("summarize", { connection });

/** Root - API Info */
app.get("/", async () => ({
  name: "Summa AI API",
  version: "1.0.0",
  status: "running",
  endpoints: {
    health: "/health",
    lectures: "/lectures",
    slides: "/slides",
    summary: "/summary"
  }
}));

/** Health check with Redis status */
app.get("/health", async () => {
  const redisHealthy = await testRedisConnection(connection);
  return {
    ok: true,
    redis: redisHealthy ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  };
});

/** Uploads */
await registerTus(app);

/** Slides (PDF→text→embedding) */
await registerSlidesRoutes(app);

/** Align (transcript↔slides evidence) */
await registerAlignRoutes(app);

/** Summarize (evidence-enforced) */
await registerSummaryRoutes(app);

/** Create lecture */
app.post("/lectures", async (req, reply) => {
  const body = CreateLectureDTO.safeParse(req.body);
  if (!body.success) return reply.code(400).send({ ok: false, error: body.error });
  const lec = await createLecture(body.data.title);
  return ApiResponse(lec);
});

/** List lectures */
app.get("/lectures", async () => {
  const lectures = await getAllLectures();
  return ApiResponse(lectures);
});

/** Create 1-hour session */
app.post("/lectures/:id/sessions", async (req, reply) => {
  const params = RouteParamsSchemas.lectureId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture ID" });

  const { id } = params.data;
  const lecture = await prisma.lecture.findUnique({ where: { id } });
  if (!lecture) return reply.code(404).send({ ok: false, error: "lecture not found" });

  const body = CreateSessionDTO.safeParse(req.body ?? {});
  if (!body.success) return reply.code(400).send({ ok: false, error: body.error });

  const sess = await createSession(id, body.data);
  return ApiResponse(sess);
});

/** Get sessions */
app.get("/lectures/:id/sessions", async (req, reply) => {
  const params = RouteParamsSchemas.lectureId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture ID" });

  const { id } = params.data;
  const lecture = await prisma.lecture.findUnique({ where: { id } });
  if (!lecture) return reply.code(404).send({ ok: false, error: "lecture not found" });

  const sessions = await getSessionsByLectureId(id);
  return ApiResponse(sessions);
});

/** Get single session by ID */
app.get("/sessions/:sid", async (req, reply) => {
  const params = RouteParamsSchemas.sessionId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid session ID" });

  const { sid } = params.data;
  const context = await findSessionById(sid);
  if (!context) {
    return reply.code(404).send({ ok: false, error: "session not found" });
  }
  return ApiResponse(context.session);
});

/** Get segments */
app.get("/sessions/:sid/segments", async (req, reply) => {
  const params = RouteParamsSchemas.sessionId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid session ID" });

  const { sid } = params.data;
  const segments = await getSegments(sid);
  return ApiResponse(segments);
});

/** Toggle session mode/policy */
app.patch("/lectures/:id/sessions/:sid", async (req, reply) => {
  const params = RouteParamsSchemas.lectureAndSession.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture or session ID" });

  const { id, sid } = params.data;
  const body = PatchSessionDTO.safeParse(req.body ?? {});
  if (!body.success) return reply.code(400).send({ ok: false, error: body.error });

  const updated = await patchSession(id, sid, body.data);
  if (!updated) return reply.code(404).send({ ok: false, error: "session not found" });
  return ApiResponse(updated);
});

/** Delete session */
app.delete("/lectures/:id/sessions/:sid", async (req, reply) => {
  const params = RouteParamsSchemas.lectureAndSession.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture or session ID" });

  const { id, sid } = params.data;
  const deleted = await deleteSession(id, sid);
  if (!deleted) return reply.code(404).send({ ok: false, error: "session not found" });
  return ApiResponse({ deleted: true, sessionId: sid });
});

/** Trigger transcription for session segments */
app.post("/sessions/:sid/ingest", async (req, reply) => {
  const params = RouteParamsSchemas.sessionId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid session ID" });

  const { sid } = params.data;

  const context = await findSessionById(sid);
  if (!context) {
    return reply.code(404).send({ ok: false, error: "session not found" });
  }
  const { lectureId, session } = context;

  const segments = await getSegments(sid);
  if (segments.length === 0) {
    return reply.code(400).send({ ok: false, error: "no segments to process" });
  }

  // Update session status to "processing"
  await prisma.session.update({
    where: { id: sid },
    data: { status: "processing" }
  });
  session.status = "processing";
  markProcessingJobs(sid, segments.length);

  // Queue transcription jobs for all segments
  const jobs = [];
  for (const seg of segments) {
    const job = await transcribeQueue.add("transcribe", {
      segmentId: seg.id,
      sessionId: sid,
      lectureId,
      localPath: seg.localPath
    }, {
      attempts: 3,
      backoff: {
        type: 'custom'
      }
    });
    jobs.push(job.id);
  }

  return ApiResponse({
    lectureId,
    session,
    jobsQueued: jobs.length,
    jobIds: jobs
  });
});

/** Get transcription paragraphs */
app.get("/sessions/:sid/transcript", async (req, reply) => {
  const params = RouteParamsSchemas.sessionId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid session ID" });

  const { sid } = params.data;
  const paragraphs = await getParagraphs(sid);
  return ApiResponse({ paragraphs });
});

/** Worker callback: append transcript paragraphs and update status */
app.post("/sessions/:sid/transcription-result", async (req, reply) => {
  const params = RouteParamsSchemas.sessionId.safeParse(req.params);
  if (!params.success) {
    return reply.code(400).send({ ok: false, error: "Invalid session ID" });
  }

  const body = TranscriptionResultSchema.safeParse(req.body ?? {});
  if (!body.success) {
    return reply
      .code(400)
      .send({ ok: false, error: body.error.message });
  }

  const { sid } = params.data;

  if (body.data.paragraphs.length > 0) {
    appendParagraphs(sid, body.data.paragraphs);
  }

  const remainingJobs = await resolveProcessingJob(sid);

  return ApiResponse({
    remainingJobs
  });
});

/** Status */
app.get("/lectures/:id/status", async (req, reply) => {
  const params = RouteParamsSchemas.lectureId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture ID" });

  const { id } = params.data;
  const lecture = await prisma.lecture.findUnique({ where: { id } });
  if (!lecture) return reply.code(404).send({ ok: false, error: "lecture not found" });

  const sessions = await getSessionsByLectureId(id);
  const counts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  return ApiResponse({ sessions, counts });
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close Fastify server (stops accepting new requests)
    await app.close();
    console.log("✅ Fastify server closed");

    // Close Prisma connection
    await prisma.$disconnect();
    console.log("✅ Prisma disconnected");

    // Close Redis connection
    await connection.quit();
    console.log("✅ Redis connection closed");

    console.log("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
app.listen({ port: config.PORT, host: "0.0.0.0" }).then(() => {
  console.log(`\n✅ API server running on http://localhost:${config.PORT}`);
  console.log(`📊 Health check: http://localhost:${config.PORT}/health\n`);
}).catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
