// src/index.ts
import { z as z5 } from "zod";

// src/validators.ts
import { z } from "zod";
var UUIDSchema = z.string().uuid("Invalid UUID format");
var RouteParamsSchemas = {
  lectureId: z.object({
    id: UUIDSchema
  }),
  sessionId: z.object({
    sid: UUIDSchema
  }),
  lectureAndSession: z.object({
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
var TranscribeJobSchema = z.object({
  segmentId: UUIDSchema,
  sessionId: UUIDSchema,
  lectureId: UUIDSchema,
  localPath: z.string().min(1)
});
var SummarizeJobSchema = z.object({
  sessionId: UUIDSchema,
  deckId: UUIDSchema.optional()
});
var PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
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
import { z as z2 } from "zod";
var SlidePage = z2.object({
  page: z2.number().int().min(1),
  text: z2.string().default(""),
  vector: z2.array(z2.number()).default([])
});
var SlideDeck = z2.object({
  id: z2.string(),
  lectureId: z2.string(),
  title: z2.string(),
  pages: z2.array(SlidePage),
  createdAt: z2.number()
});

// src/summary.ts
import { z as z3 } from "zod";
var SummaryItem = z3.object({
  id: z3.string(),
  level: z3.enum(["segment", "overall"]).default("segment"),
  text: z3.string(),
  evidence_ids: z3.array(z3.string()).default([]),
  score: z3.number().min(0).max(1).default(0),
  startMs: z3.number().int().nonnegative().optional(),
  endMs: z3.number().int().nonnegative().optional()
});
var SummaryReport = z3.object({
  sessionId: z3.string(),
  deckId: z3.string(),
  items: z3.array(SummaryItem),
  metrics: z3.object({
    coverage: z3.number().min(0).max(1),
    avgAlignScore: z3.number().min(0).max(1),
    evidenceCoverage: z3.number().min(0).max(1),
    hallucinationRate: z3.number().min(0).max(1)
  }),
  createdAt: z3.number()
});

// src/transcript.ts
import { z as z4 } from "zod";
var TranscriptParagraphSchema = z4.object({
  id: z4.string(),
  text: z4.string(),
  startMs: z4.number().int().nonnegative().optional(),
  endMs: z4.number().int().nonnegative().optional()
});
var TranscriptionResultSchema = z4.object({
  segmentId: z4.string().uuid(),
  lectureId: z4.string().uuid().optional(),
  paragraphs: z4.array(TranscriptParagraphSchema)
});

// src/index.ts
var Lecture = z5.object({
  id: z5.string(),
  title: z5.string(),
  createdAt: z5.number()
});
var SessionMode = z5.enum(["manual", "auto"]);
var SegmentPolicy = z5.object({
  lengthMin: z5.number().int().positive().default(55),
  overlapSec: z5.number().int().min(0).default(5),
  vadPause: z5.boolean().default(true)
});
var Session = z5.object({
  id: z5.string(),
  lectureId: z5.string(),
  idx: z5.number().int(),
  mode: SessionMode,
  policy: SegmentPolicy,
  status: z5.enum(["idle", "recording", "uploaded", "processing", "completed", "error"]).default("idle"),
  createdAt: z5.number()
});
var CreateLectureDTO = z5.object({ title: z5.string().min(1) });
var CreateSessionDTO = z5.object({
  mode: SessionMode.default("manual"),
  policy: SegmentPolicy.partial().default({})
});
var PatchSessionDTO = z5.object({
  mode: SessionMode.optional(),
  policy: SegmentPolicy.partial().optional()
});
var ApiResponse = (data) => ({ ok: true, data });
export {
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
};
