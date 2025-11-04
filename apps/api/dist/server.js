import {
  CONSTANTS,
  config,
  createRedisConnection,
  testRedisConnection
} from "./chunk-MDU3YXXR.js";

// src/server.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import {
  CreateLectureDTO,
  CreateSessionDTO,
  PatchSessionDTO,
  ApiResponse as ApiResponse5,
  RouteParamsSchemas as RouteParamsSchemas2,
  TranscriptionResultSchema
} from "@summa/shared";

// src/db.ts
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
var prisma = new PrismaClient();
var processingJobs = /* @__PURE__ */ new Map();
function toPrismaSession(prismaSession) {
  return {
    id: prismaSession.id,
    lectureId: prismaSession.lectureId,
    idx: prismaSession.idx,
    mode: prismaSession.mode,
    policy: {
      lengthMin: prismaSession.policyLengthMin,
      overlapSec: prismaSession.policyOverlapSec,
      vadPause: prismaSession.policyVadPause
    },
    status: prismaSession.status,
    createdAt: Number(prismaSession.createdAt)
  };
}
async function createLecture(title) {
  const lec = await prisma.lecture.create({
    data: {
      id: randomUUID(),
      title,
      createdAt: BigInt(Date.now())
    }
  });
  return {
    id: lec.id,
    title: lec.title,
    createdAt: Number(lec.createdAt)
  };
}
async function createSession(lectureId, partial) {
  const count = await prisma.session.count({
    where: { lectureId }
  });
  const sess = await prisma.session.create({
    data: {
      id: randomUUID(),
      lectureId,
      idx: count,
      mode: partial.mode ?? "manual",
      policyLengthMin: partial.policy?.lengthMin ?? 55,
      policyOverlapSec: partial.policy?.overlapSec ?? 5,
      policyVadPause: partial.policy?.vadPause ?? true,
      status: "idle",
      createdAt: BigInt(Date.now())
    }
  });
  return toPrismaSession(sess);
}
async function registerSegment(sessionId, segment) {
  const seg = await prisma.segment.create({
    data: {
      id: segment.id,
      sessionId,
      localPath: segment.localPath,
      createdAt: BigInt(segment.createdAt ?? Date.now())
    }
  });
  await prisma.session.updateMany({
    where: {
      id: sessionId,
      status: {
        notIn: ["processing", "completed"]
      }
    },
    data: {
      status: "uploaded"
    }
  });
  return {
    id: seg.id,
    sessionId: seg.sessionId,
    localPath: seg.localPath ?? void 0,
    createdAt: Number(seg.createdAt)
  };
}
async function getSegments(sessionId) {
  const segments = await prisma.segment.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" }
  });
  return segments.map((seg) => ({
    id: seg.id,
    sessionId: seg.sessionId,
    localPath: seg.localPath ?? void 0,
    createdAt: Number(seg.createdAt)
  }));
}
async function patchSession(lectureId, sid, update) {
  const existing = await prisma.session.findFirst({
    where: {
      id: sid,
      lectureId
    }
  });
  if (!existing) return null;
  const updated = await prisma.session.update({
    where: { id: sid },
    data: {
      mode: update.mode ?? existing.mode,
      policyLengthMin: update.policy?.lengthMin ?? existing.policyLengthMin,
      policyOverlapSec: update.policy?.overlapSec ?? existing.policyOverlapSec,
      policyVadPause: update.policy?.vadPause ?? existing.policyVadPause
    }
  });
  return toPrismaSession(updated);
}
async function deleteSession(lectureId, sid) {
  const existing = await prisma.session.findFirst({
    where: {
      id: sid,
      lectureId
    }
  });
  if (!existing) return false;
  await prisma.session.delete({
    where: { id: sid }
  });
  return true;
}
async function findSessionById(sessionId) {
  const sess = await prisma.session.findUnique({
    where: { id: sessionId }
  });
  if (!sess) return null;
  return {
    lectureId: sess.lectureId,
    session: toPrismaSession(sess)
  };
}
async function getAllLectures() {
  const lectures = await prisma.lecture.findMany({
    orderBy: { createdAt: "desc" }
  });
  return lectures.map((lec) => ({
    id: lec.id,
    title: lec.title,
    createdAt: Number(lec.createdAt)
  }));
}
async function getSessionsByLectureId(lectureId) {
  const sessions = await prisma.session.findMany({
    where: { lectureId },
    orderBy: { idx: "asc" }
  });
  return sessions.map(toPrismaSession);
}
function markProcessingJobs(sessionId, jobCount) {
  processingJobs.set(sessionId, jobCount);
}
async function resolveProcessingJob(sessionId) {
  if (!processingJobs.has(sessionId)) {
    await prisma.session.updateMany({
      where: { id: sessionId },
      data: { status: "completed" }
    });
    return 0;
  }
  const remaining = (processingJobs.get(sessionId) ?? 0) - 1;
  if (remaining <= 0) {
    processingJobs.delete(sessionId);
    await prisma.session.updateMany({
      where: { id: sessionId },
      data: { status: "completed" }
    });
    return 0;
  }
  processingJobs.set(sessionId, remaining);
  return remaining;
}

// src/upload.ts
import { ApiResponse, RouteParamsSchemas, FileValidators } from "@summa/shared";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { randomUUID as randomUUID2 } from "crypto";
import { Transform } from "stream";
var UPLOAD_DIR = path.join(process.cwd(), "uploads");
var MAX_FILE_MB = 500;
var MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
var FileTooLargeError = class extends Error {
  constructor(limitMb) {
    super(`File size exceeds ${limitMb}MB limit`);
    this.name = "FileTooLargeError";
  }
};
function createSizeGuard(limitBytes) {
  let total = 0;
  return new Transform({
    transform(chunk, _encoding, callback) {
      total += chunk.length;
      if (total > limitBytes) {
        callback(new FileTooLargeError(limitBytes / (1024 * 1024)));
        return;
      }
      callback(null, chunk);
    }
  });
}
async function registerTus(app2) {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  app2.post("/sessions/:sid/upload", async (req, reply) => {
    const params = RouteParamsSchemas.sessionId.safeParse(req.params);
    if (!params.success) {
      return reply.code(400).send({ ok: false, error: "Invalid session ID" });
    }
    const { sid: sessionId } = params.data;
    const data = await req.file();
    if (!data) {
      return reply.code(400).send({ ok: false, error: "No file uploaded" });
    }
    if (!FileValidators.isAllowedAudioType(data.mimetype)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid file type: ${data.mimetype}. Only audio files are allowed.`
      });
    }
    const segmentId = randomUUID2();
    const extension = data.mimetype.split("/")[1]?.replace("mpeg", "mp3") || "webm";
    const filename = `${sessionId}_${segmentId}_${Date.now()}.${extension}`;
    const localPath = path.join(UPLOAD_DIR, filename);
    try {
      await pipeline(
        data.file,
        createSizeGuard(MAX_FILE_BYTES),
        fs.createWriteStream(localPath)
      );
      const segment = await registerSegment(sessionId, {
        id: segmentId,
        localPath
      });
      app2.log.info({ segId: segment.id, mimetype: data.mimetype, size: data.file.bytesRead }, "segment uploaded");
      return ApiResponse({ segment });
    } catch (err) {
      app2.log.error(err, "Upload failed");
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
      if (err instanceof FileTooLargeError) {
        return reply.code(400).send({ ok: false, error: err.message });
      }
      return reply.code(500).send({ ok: false, error: "Upload failed" });
    }
  });
}

// src/slides.routes.ts
import fs2 from "fs";
import path2 from "path";
import { extractPagesFromPDF } from "@summa/slides";
import { embedTexts } from "@summa/embeddings";

// src/db_slides.ts
import { randomUUID as randomUUID3 } from "crypto";
var decks = /* @__PURE__ */ new Map();
var decksByLecture = /* @__PURE__ */ new Map();
function createDeck(lectureId, title, pages) {
  const id = randomUUID3();
  const deck = { id, lectureId, title, pages, createdAt: Date.now() };
  decks.set(id, deck);
  const arr = decksByLecture.get(lectureId) ?? [];
  arr.push(id);
  decksByLecture.set(lectureId, arr);
  return deck;
}
function getDeck(id) {
  return decks.get(id);
}
function listDecksByLecture(lectureId) {
  const ids = decksByLecture.get(lectureId) ?? [];
  return ids.map((id) => decks.get(id)).filter(Boolean);
}

// src/slides.routes.ts
import { ApiResponse as ApiResponse2 } from "@summa/shared";
async function registerSlidesRoutes(app2) {
  app2.post("/slides/upload", async (req, reply) => {
    const mp = await req.file();
    if (!mp) return reply.code(400).send({ ok: false, error: "missing file" });
    const getLectureIdField = mp.fields.lectureId;
    const lectureIdValue = Array.isArray(getLectureIdField) ? getLectureIdField[0] : getLectureIdField;
    const lectureId = (lectureIdValue && typeof lectureIdValue === "object" && "value" in lectureIdValue ? String(lectureIdValue.value) : "") || "";
    const getTitleField = mp.fields.title;
    const titleValue = Array.isArray(getTitleField) ? getTitleField[0] : getTitleField;
    const title = (titleValue && typeof titleValue === "object" && "value" in titleValue ? String(titleValue.value) : mp.filename) || "Slides";
    if (!lectureId) return reply.code(400).send({ ok: false, error: "missing lectureId" });
    const sanitizeFilename = (filename) => {
      return filename.replace(/[\/\\:*?"<>|]/g, "_").replace(/\.\./g, "_");
    };
    const uploadDir = path2.join(process.cwd(), "uploads", "slides");
    fs2.mkdirSync(uploadDir, { recursive: true });
    const safeFilename = sanitizeFilename(mp.filename);
    const fpath = path2.join(uploadDir, `${Date.now()}_${safeFilename}`);
    const resolvedPath = path2.resolve(fpath);
    const resolvedUploadDir = path2.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return reply.code(400).send({ ok: false, error: "Invalid file path" });
    }
    await fs2.promises.writeFile(fpath, await mp.toBuffer());
    console.log("[Slides Upload] Using text-only extraction...");
    const pages = await extractPagesFromPDF(fpath);
    const trimmed = pages.map((p) => ({
      page: p.page,
      text: (p.text ?? "").slice(0, 4e3)
    }));
    const vectors = await embedTexts(trimmed.map((p) => p.text));
    const deck = createDeck(lectureId, title, trimmed.map((p, i) => ({
      page: p.page,
      text: p.text,
      vector: vectors[i]?.vector ?? []
    })));
    return ApiResponse2(deck);
  });
  app2.get("/lectures/:id/slides", async (req, reply) => {
    const id = req.params.id;
    return ApiResponse2(listDecksByLecture(id));
  });
  app2.get("/slides/:deckId", async (req, reply) => {
    const deckId = req.params.deckId;
    const deck = getDeck(deckId);
    if (!deck) return reply.code(404).send({ ok: false, error: "deck not found" });
    return ApiResponse2(deck);
  });
}

// src/align.routes.ts
import { z as z2 } from "zod";
import { ApiResponse as ApiResponse3 } from "@summa/shared";

// src/db_transcript.ts
import { TranscriptParagraphSchema } from "@summa/shared";
import { z } from "zod";
var paragraphs = /* @__PURE__ */ new Map();
var alignments = /* @__PURE__ */ new Map();
function saveParagraphs(sessionId, items) {
  paragraphs.set(sessionId, items);
}
function appendParagraph(sessionId, item) {
  const list = paragraphs.get(sessionId) ?? [];
  list.push(item);
  paragraphs.set(sessionId, list);
}
function getParagraphs(sessionId) {
  return [...paragraphs.get(sessionId) ?? []];
}
function saveAlignments(sessionId, items) {
  alignments.set(sessionId, items);
}
function getAlignments(sessionId) {
  return [...alignments.get(sessionId) ?? []];
}
var ParagraphSchema = TranscriptParagraphSchema;
var AlignmentSchema = z.object({
  paraId: z.string(),
  slidePage: z.number().int().min(1),
  deckId: z.string(),
  score: z.number().min(0).max(1)
});
function appendParagraphs(sessionId, items) {
  for (const item of items) {
    appendParagraph(sessionId, item);
  }
}

// src/align.routes.ts
var AlignPayload = z2.object({
  paragraphs: z2.array(ParagraphSchema).default([]),
  alignments: z2.array(AlignmentSchema).default([])
});
async function registerAlignRoutes(app2) {
  app2.post("/sessions/:sid/align", async (req, reply) => {
    const sid = req.params.sid;
    const body = AlignPayload.safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ ok: false, error: body.error });
    saveParagraphs(sid, body.data.paragraphs);
    saveAlignments(sid, body.data.alignments);
    return ApiResponse3({ paragraphs: body.data.paragraphs.length, alignments: body.data.alignments.length });
  });
  app2.get("/sessions/:sid/align", async (req) => {
    const sid = req.params.sid;
    return ApiResponse3({
      paragraphs: getParagraphs(sid),
      alignments: getAlignments(sid)
    });
  });
}

// src/summary.routes.ts
import { ApiResponse as ApiResponse4, SummaryItem as SummaryItemSchema } from "@summa/shared";
import { summarizeWithEvidence } from "@summa/summarizer";

// src/db_summary.ts
var store = /* @__PURE__ */ new Map();
function saveSummary(report) {
  store.set(report.sessionId, report);
}
function getSummary(sessionId) {
  return store.get(sessionId);
}

// src/summary.routes.ts
async function registerSummaryRoutes(app2) {
  app2.post("/sessions/:sid/summarize", async (req, reply) => {
    const { sid } = req.params;
    const context = await findSessionById(sid);
    if (!context) return reply.code(404).send({ ok: false, error: "session not found" });
    const { lectureId } = context;
    const paragraphs2 = getParagraphs(sid);
    if (paragraphs2.length === 0) return reply.code(400).send({ ok: false, error: "no transcript paragraphs" });
    const decks2 = listDecksByLecture(lectureId);
    const hasSlides = decks2.length > 0;
    const deck = hasSlides ? decks2[decks2.length - 1] : null;
    let input, report;
    if (hasSlides && deck) {
      const alignments2 = getAlignments(sid);
      const coverage = Number((alignments2.length / Math.max(1, paragraphs2.length)).toFixed(4));
      const avgAlignScore = alignments2.length === 0 ? 0 : Number((alignments2.reduce((acc, cur) => acc + cur.score, 0) / alignments2.length).toFixed(4));
      input = {
        sessionId: sid,
        deckId: deck.id,
        paragraphs: paragraphs2.map((p) => ({ id: p.id, text: p.text, startMs: p.startMs, endMs: p.endMs })),
        slides: deck.pages.map((p) => ({ deckId: deck.id, page: p.page, text: p.text })),
        alignments: alignments2.map((a) => ({ paraId: a.paraId, slidePage: a.slidePage, deckId: a.deckId, score: a.score })),
        coverage,
        avgAlignScore
      };
      const summarized = await summarizeWithEvidence(input);
      const evidenceCount = summarized.items.filter((item) => (item.evidence_ids?.length ?? 0) > 0).length;
      const evidenceCoverage = summarized.items.length === 0 ? 0 : Number((evidenceCount / summarized.items.length).toFixed(4));
      const hallucinationRate = Number((1 - evidenceCoverage).toFixed(4));
      report = {
        sessionId: sid,
        deckId: deck.id,
        items: summarized.items.map((item) => SummaryItemSchema.parse(item)),
        metrics: {
          coverage,
          avgAlignScore,
          evidenceCoverage,
          hallucinationRate
        },
        createdAt: Date.now()
      };
    } else {
      input = {
        sessionId: sid,
        deckId: "no-slides",
        paragraphs: paragraphs2.map((p) => ({ id: p.id, text: p.text, startMs: p.startMs, endMs: p.endMs })),
        slides: [],
        alignments: [],
        coverage: 0,
        avgAlignScore: 0
      };
      const summarized = await summarizeWithEvidence(input);
      report = {
        sessionId: sid,
        deckId: "no-slides",
        items: summarized.items.map((item) => SummaryItemSchema.parse(item)),
        metrics: {
          coverage: 0,
          avgAlignScore: 0,
          evidenceCoverage: 0,
          hallucinationRate: 1
        },
        createdAt: Date.now()
      };
    }
    saveSummary(report);
    return ApiResponse4(report);
  });
  app2.get("/sessions/:sid/summary", async (req) => {
    const sid = req.params.sid;
    const report = getSummary(sid);
    return report ? ApiResponse4(report) : { ok: false, error: "no summary" };
  });
}

// src/server.ts
import { Queue } from "bullmq";
console.log("\u{1F680} Starting Summa AI API...");
console.log(`\u{1F4DD} Environment: ${config.NODE_ENV}`);
console.log(`\u{1F50C} Port: ${config.PORT}`);
console.log(`\u{1F310} Allowed origins: ${config.ALLOWED_ORIGINS.join(", ")}`);
var app = Fastify({
  logger: config.NODE_ENV === "development" ? true : {
    level: "info"
  }
});
await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) {
      cb(null, true);
      return;
    }
    if (config.ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true);
      return;
    }
    if (origin.endsWith(".vercel.app")) {
      cb(null, true);
      return;
    }
    cb(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
});
await app.register(multipart, {
  limits: {
    fileSize: CONSTANTS.MAX_FILE_SIZE,
    files: CONSTANTS.MAX_FILES_PER_REQUEST
  }
});
console.log("\u{1F4E1} Connecting to Redis...");
var connection = createRedisConnection();
var isRedisHealthy = await testRedisConnection(connection);
if (!isRedisHealthy) {
  console.error("\u274C Redis connection failed. Server will start but job processing will not work.");
} else {
  console.log("\u2705 Redis connection established");
}
var transcribeQueue = new Queue("transcribe", { connection });
var summarizeQueue = new Queue("summarize", { connection });
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
app.get("/health", async () => {
  const redisHealthy = await testRedisConnection(connection);
  return {
    ok: true,
    redis: redisHealthy ? "connected" : "disconnected",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
});
await registerTus(app);
await registerSlidesRoutes(app);
await registerAlignRoutes(app);
await registerSummaryRoutes(app);
app.post("/lectures", async (req, reply) => {
  const body = CreateLectureDTO.safeParse(req.body);
  if (!body.success) return reply.code(400).send({ ok: false, error: body.error });
  const lec = await createLecture(body.data.title);
  return ApiResponse5(lec);
});
app.get("/lectures", async () => {
  const lectures = await getAllLectures();
  return ApiResponse5(lectures);
});
app.post("/lectures/:id/sessions", async (req, reply) => {
  const params = RouteParamsSchemas2.lectureId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture ID" });
  const { id } = params.data;
  const lecture = await prisma.lecture.findUnique({ where: { id } });
  if (!lecture) return reply.code(404).send({ ok: false, error: "lecture not found" });
  const body = CreateSessionDTO.safeParse(req.body ?? {});
  if (!body.success) return reply.code(400).send({ ok: false, error: body.error });
  const sess = await createSession(id, body.data);
  return ApiResponse5(sess);
});
app.get("/lectures/:id/sessions", async (req, reply) => {
  const params = RouteParamsSchemas2.lectureId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture ID" });
  const { id } = params.data;
  const lecture = await prisma.lecture.findUnique({ where: { id } });
  if (!lecture) return reply.code(404).send({ ok: false, error: "lecture not found" });
  const sessions = await getSessionsByLectureId(id);
  return ApiResponse5(sessions);
});
app.get("/sessions/:sid", async (req, reply) => {
  const params = RouteParamsSchemas2.sessionId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid session ID" });
  const { sid } = params.data;
  const context = await findSessionById(sid);
  if (!context) {
    return reply.code(404).send({ ok: false, error: "session not found" });
  }
  return ApiResponse5(context.session);
});
app.get("/sessions/:sid/segments", async (req, reply) => {
  const params = RouteParamsSchemas2.sessionId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid session ID" });
  const { sid } = params.data;
  const segments = await getSegments(sid);
  return ApiResponse5(segments);
});
app.patch("/lectures/:id/sessions/:sid", async (req, reply) => {
  const params = RouteParamsSchemas2.lectureAndSession.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture or session ID" });
  const { id, sid } = params.data;
  const body = PatchSessionDTO.safeParse(req.body ?? {});
  if (!body.success) return reply.code(400).send({ ok: false, error: body.error });
  const updated = await patchSession(id, sid, body.data);
  if (!updated) return reply.code(404).send({ ok: false, error: "session not found" });
  return ApiResponse5(updated);
});
app.delete("/lectures/:id/sessions/:sid", async (req, reply) => {
  const params = RouteParamsSchemas2.lectureAndSession.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture or session ID" });
  const { id, sid } = params.data;
  const deleted = await deleteSession(id, sid);
  if (!deleted) return reply.code(404).send({ ok: false, error: "session not found" });
  return ApiResponse5({ deleted: true, sessionId: sid });
});
app.post("/sessions/:sid/ingest", async (req, reply) => {
  const params = RouteParamsSchemas2.sessionId.safeParse(req.params);
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
  await prisma.session.update({
    where: { id: sid },
    data: { status: "processing" }
  });
  session.status = "processing";
  markProcessingJobs(sid, segments.length);
  const jobs = [];
  for (const seg of segments) {
    const job = await transcribeQueue.add("transcribe", {
      segmentId: seg.id,
      sessionId: sid,
      lectureId,
      localPath: seg.localPath
    });
    jobs.push(job.id);
  }
  return ApiResponse5({
    lectureId,
    session,
    jobsQueued: jobs.length,
    jobIds: jobs
  });
});
app.get("/sessions/:sid/transcript", async (req, reply) => {
  const params = RouteParamsSchemas2.sessionId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid session ID" });
  const { sid } = params.data;
  const paragraphs2 = getParagraphs(sid);
  return ApiResponse5({ paragraphs: paragraphs2 });
});
app.post("/sessions/:sid/transcription-result", async (req, reply) => {
  const params = RouteParamsSchemas2.sessionId.safeParse(req.params);
  if (!params.success) {
    return reply.code(400).send({ ok: false, error: "Invalid session ID" });
  }
  const body = TranscriptionResultSchema.safeParse(req.body ?? {});
  if (!body.success) {
    return reply.code(400).send({ ok: false, error: body.error.message });
  }
  const { sid } = params.data;
  if (body.data.paragraphs.length > 0) {
    appendParagraphs(sid, body.data.paragraphs);
  }
  const remainingJobs = await resolveProcessingJob(sid);
  return ApiResponse5({
    remainingJobs
  });
});
app.get("/lectures/:id/status", async (req, reply) => {
  const params = RouteParamsSchemas2.lectureId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid lecture ID" });
  const { id } = params.data;
  const lecture = await prisma.lecture.findUnique({ where: { id } });
  if (!lecture) return reply.code(404).send({ ok: false, error: "lecture not found" });
  const sessions = await getSessionsByLectureId(id);
  const counts = sessions.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  return ApiResponse5({ sessions, counts });
});
async function gracefulShutdown(signal) {
  console.log(`
${signal} received. Starting graceful shutdown...`);
  try {
    await app.close();
    console.log("\u2705 Fastify server closed");
    await prisma.$disconnect();
    console.log("\u2705 Prisma disconnected");
    await connection.quit();
    console.log("\u2705 Redis connection closed");
    console.log("\u2705 Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("\u274C Error during shutdown:", error);
    process.exit(1);
  }
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
app.listen({ port: config.PORT, host: "0.0.0.0" }).then(() => {
  console.log(`
\u2705 API server running on http://localhost:${config.PORT}`);
  console.log(`\u{1F4CA} Health check: http://localhost:${config.PORT}/health
`);
}).catch((error) => {
  console.error("\u274C Failed to start server:", error);
  process.exit(1);
});
