import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import {
  CreateLectureDTO,
  CreateSessionDTO,
  PatchSessionDTO,
  ApiResponse,
  RouteParamsSchemas
} from "@summa/shared";
import { createLecture, createSession, mem, patchSession, getSegments, deleteSession } from "./db.js";
import { registerTus } from "./upload.js";
import { registerSlidesRoutes } from "./slides.routes.js";
import { registerAlignRoutes } from "./align.routes.js";
import { registerSummaryRoutes } from "./summary.routes.js";
import { getParagraphs } from "./db_transcript.js";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const app = Fastify({ logger: true });

// CORS configuration - allow localhost and vercel domains
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001'
];

await app.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      cb(null, true);
      return;
    }

    // Allow if in allowedOrigins list
    if (allowedOrigins.includes(origin)) {
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
    fileSize: 500 * 1024 * 1024, // 500MB max
    files: 1 // Only allow 1 file per request
  }
});

const connection = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
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

/** Health */
app.get("/health", async () => ({ ok: true }));

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
  const lec = createLecture(body.data.title);
  return ApiResponse(lec);
});

/** List lectures */
app.get("/lectures", async () => ApiResponse(Array.from(mem.lectures.values())));

/** Create 1-hour session */
app.post("/lectures/:id/sessions", async (req, reply) => {
  const params = RouteParamsSchemas.lectureId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture ID" });

  const { id } = params.data;
  if (!mem.lectures.has(id)) return reply.code(404).send({ ok: false, error: "lecture not found" });

  const body = CreateSessionDTO.safeParse(req.body ?? {});
  if (!body.success) return reply.code(400).send({ ok: false, error: body.error });

  const sess = createSession(id, body.data as any);
  return ApiResponse(sess);
});

/** Get sessions */
app.get("/lectures/:id/sessions", async (req, reply) => {
  const params = RouteParamsSchemas.lectureId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture ID" });

  const { id } = params.data;
  if (!mem.lectures.has(id)) return reply.code(404).send({ ok: false, error: "lecture not found" });
  return ApiResponse(mem.sessions.get(id) ?? []);
});

/** Get segments */
app.get("/sessions/:sid/segments", async (req, reply) => {
  const params = RouteParamsSchemas.sessionId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid session ID" });

  const { sid } = params.data;
  return ApiResponse(getSegments(sid));
});

/** Toggle session mode/policy */
app.patch("/lectures/:id/sessions/:sid", async (req, reply) => {
  const params = RouteParamsSchemas.lectureAndSession.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture or session ID" });

  const { id, sid } = params.data;
  const body = PatchSessionDTO.safeParse(req.body ?? {});
  if (!body.success) return reply.code(400).send({ ok: false, error: body.error });

  const updated = patchSession(id, sid, body.data as any);
  if (!updated) return reply.code(404).send({ ok: false, error: "session not found" });
  return ApiResponse(updated);
});

/** Delete session */
app.delete("/lectures/:id/sessions/:sid", async (req, reply) => {
  const params = RouteParamsSchemas.lectureAndSession.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture or session ID" });

  const { id, sid } = params.data;
  const deleted = deleteSession(id, sid);
  if (!deleted) return reply.code(404).send({ ok: false, error: "session not found" });
  return ApiResponse({ deleted: true, sessionId: sid });
});

/** Trigger transcription for session segments */
app.post("/sessions/:sid/ingest", async (req, reply) => {
  const params = RouteParamsSchemas.sessionId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid session ID" });

  const { sid } = params.data;

  let session = null;
  let lectureId = null;
  for (const [lecId, list] of mem.sessions.entries()) {
    const s = list.find(x => x.id === sid);
    if (s) {
      session = s;
      lectureId = lecId;
      break;
    }
  }

  if (!session) {
    return reply.code(404).send({ ok: false, error: "session not found" });
  }

  const segments = getSegments(sid);
  if (segments.length === 0) {
    return reply.code(400).send({ ok: false, error: "no segments to process" });
  }

  session.status = "processing";

  // Queue transcription jobs for all segments
  const jobs = [];
  for (const seg of segments) {
    const job = await transcribeQueue.add("transcribe", {
      segmentId: seg.id,
      sessionId: sid,
      lectureId
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
  const paragraphs = getParagraphs(sid);
  return ApiResponse({ paragraphs });
});

/** Status */
app.get("/lectures/:id/status", async (req, reply) => {
  const params = RouteParamsSchemas.lectureId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture ID" });

  const { id } = params.data;
  if (!mem.lectures.has(id)) return reply.code(404).send({ ok: false, error: "lecture not found" });

  const sessions = mem.sessions.get(id) ?? [];
  const counts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  return ApiResponse({ sessions, counts });
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log(`API on http://localhost:${PORT}`);
});
