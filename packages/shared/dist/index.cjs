"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ALLOWED_AUDIO_MIMES: () => ALLOWED_AUDIO_MIMES,
  ALLOWED_PDF_MIMES: () => ALLOWED_PDF_MIMES,
  ApiResponse: () => ApiResponse,
  CreateLectureDTO: () => CreateLectureDTO,
  CreateSessionDTO: () => CreateSessionDTO,
  FileValidators: () => FileValidators,
  Lecture: () => Lecture,
  PaginationSchema: () => PaginationSchema,
  PatchSessionDTO: () => PatchSessionDTO,
  RouteParamsSchemas: () => RouteParamsSchemas,
  SegmentPolicy: () => SegmentPolicy,
  Session: () => Session,
  SessionMode: () => SessionMode,
  SlideDeck: () => SlideDeck,
  SlidePage: () => SlidePage,
  SummarizeJobSchema: () => SummarizeJobSchema,
  SummaryItem: () => SummaryItem,
  SummaryReport: () => SummaryReport,
  TranscribeJobSchema: () => TranscribeJobSchema,
  TranscriptParagraphSchema: () => TranscriptParagraphSchema,
  TranscriptionResultSchema: () => TranscriptionResultSchema,
  UUIDSchema: () => UUIDSchema,
  createApiResponse: () => createApiResponse
});
module.exports = __toCommonJS(index_exports);
var import_zod5 = require("zod");

// src/validators.ts
var import_zod = require("zod");
var UUIDSchema = import_zod.z.string().uuid("Invalid UUID format");
var RouteParamsSchemas = {
  lectureId: import_zod.z.object({
    id: UUIDSchema
  }),
  sessionId: import_zod.z.object({
    sid: UUIDSchema
  }),
  lectureAndSession: import_zod.z.object({
    id: UUIDSchema,
    sid: UUIDSchema
  })
};
var ALLOWED_AUDIO_MIMES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/aacp",
  "audio/ogg",
  "audio/flac",
  "audio/x-flac",
  "video/mp4",
  // Sometimes audio recordings are video/mp4
  "video/webm"
];
var ALLOWED_PDF_MIMES = [
  "application/pdf"
];
var FileValidators = {
  isAllowedAudioType: (mimetype) => {
    return ALLOWED_AUDIO_MIMES.includes(mimetype);
  },
  isAllowedPDFType: (mimetype) => {
    return ALLOWED_PDF_MIMES.includes(mimetype);
  },
  validateFileSize: (size, maxMB) => {
    const maxBytes = maxMB * 1024 * 1024;
    if (size > maxBytes) {
      return {
        valid: false,
        error: `File size exceeds ${maxMB}MB limit`
      };
    }
    return { valid: true };
  }
};
var TranscribeJobSchema = import_zod.z.object({
  segmentId: UUIDSchema,
  sessionId: UUIDSchema,
  lectureId: UUIDSchema,
  localPath: import_zod.z.string().min(1)
});
var SummarizeJobSchema = import_zod.z.object({
  sessionId: UUIDSchema,
  deckId: UUIDSchema.optional()
});
var PaginationSchema = import_zod.z.object({
  page: import_zod.z.coerce.number().int().positive().default(1),
  limit: import_zod.z.coerce.number().int().positive().max(100).default(10)
});
var createApiResponse = {
  success: (data) => ({
    ok: true,
    data
  }),
  error: (error, details) => ({
    ok: false,
    error,
    details
  })
};

// src/slides.ts
var import_zod2 = require("zod");
var SlidePage = import_zod2.z.object({
  page: import_zod2.z.number().int().min(1),
  text: import_zod2.z.string().default(""),
  vector: import_zod2.z.array(import_zod2.z.number()).default([])
});
var SlideDeck = import_zod2.z.object({
  id: import_zod2.z.string(),
  lectureId: import_zod2.z.string(),
  title: import_zod2.z.string(),
  pages: import_zod2.z.array(SlidePage),
  createdAt: import_zod2.z.number()
});

// src/summary.ts
var import_zod3 = require("zod");
var SummaryItem = import_zod3.z.object({
  id: import_zod3.z.string(),
  level: import_zod3.z.enum(["segment", "overall"]).default("segment"),
  text: import_zod3.z.string(),
  evidence_ids: import_zod3.z.array(import_zod3.z.string()).default([]),
  score: import_zod3.z.number().min(0).max(1).default(0),
  startMs: import_zod3.z.number().int().nonnegative().optional(),
  endMs: import_zod3.z.number().int().nonnegative().optional()
});
var SummaryReport = import_zod3.z.object({
  sessionId: import_zod3.z.string(),
  deckId: import_zod3.z.string(),
  items: import_zod3.z.array(SummaryItem),
  metrics: import_zod3.z.object({
    coverage: import_zod3.z.number().min(0).max(1),
    avgAlignScore: import_zod3.z.number().min(0).max(1),
    evidenceCoverage: import_zod3.z.number().min(0).max(1),
    hallucinationRate: import_zod3.z.number().min(0).max(1)
  }),
  createdAt: import_zod3.z.number()
});

// src/transcript.ts
var import_zod4 = require("zod");
var TranscriptParagraphSchema = import_zod4.z.object({
  id: import_zod4.z.string(),
  text: import_zod4.z.string(),
  startMs: import_zod4.z.number().int().nonnegative().optional(),
  endMs: import_zod4.z.number().int().nonnegative().optional()
});
var TranscriptionResultSchema = import_zod4.z.object({
  segmentId: import_zod4.z.string().uuid(),
  lectureId: import_zod4.z.string().uuid().optional(),
  paragraphs: import_zod4.z.array(TranscriptParagraphSchema)
});

// src/index.ts
var Lecture = import_zod5.z.object({
  id: import_zod5.z.string(),
  title: import_zod5.z.string(),
  createdAt: import_zod5.z.number()
});
var SessionMode = import_zod5.z.enum(["manual", "auto"]);
var SegmentPolicy = import_zod5.z.object({
  lengthMin: import_zod5.z.number().int().positive().default(55),
  overlapSec: import_zod5.z.number().int().min(0).default(5),
  vadPause: import_zod5.z.boolean().default(true)
});
var Session = import_zod5.z.object({
  id: import_zod5.z.string(),
  lectureId: import_zod5.z.string(),
  idx: import_zod5.z.number().int(),
  mode: SessionMode,
  policy: SegmentPolicy,
  status: import_zod5.z.enum(["idle", "recording", "uploaded", "processing", "completed", "error"]).default("idle"),
  createdAt: import_zod5.z.number()
});
var CreateLectureDTO = import_zod5.z.object({ title: import_zod5.z.string().min(1) });
var CreateSessionDTO = import_zod5.z.object({
  mode: SessionMode.default("manual"),
  policy: SegmentPolicy.partial().default({})
});
var PatchSessionDTO = import_zod5.z.object({
  mode: SessionMode.optional(),
  policy: SegmentPolicy.partial().optional()
});
var ApiResponse = (data) => ({ ok: true, data });
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ALLOWED_AUDIO_MIMES,
  ALLOWED_PDF_MIMES,
  ApiResponse,
  CreateLectureDTO,
  CreateSessionDTO,
  FileValidators,
  Lecture,
  PaginationSchema,
  PatchSessionDTO,
  RouteParamsSchemas,
  SegmentPolicy,
  Session,
  SessionMode,
  SlideDeck,
  SlidePage,
  SummarizeJobSchema,
  SummaryItem,
  SummaryReport,
  TranscribeJobSchema,
  TranscriptParagraphSchema,
  TranscriptionResultSchema,
  UUIDSchema,
  createApiResponse
});
