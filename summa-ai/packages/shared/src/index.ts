import { z } from "zod";

/** --- Domain Types --- */
export const Lecture = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number()
});
export type Lecture = z.infer<typeof Lecture>;

export const SessionMode = z.enum(["manual", "auto"]);
export type SessionMode = z.infer<typeof SessionMode>;

export const SegmentPolicy = z.object({
  lengthMin: z.number().int().positive().default(55),
  overlapSec: z.number().int().min(0).default(5),
  vadPause: z.boolean().default(true)
});
export type SegmentPolicy = z.infer<typeof SegmentPolicy>;

export const Session = z.object({
  id: z.string(),
  lectureId: z.string(),
  idx: z.number().int(),
  mode: SessionMode,
  policy: SegmentPolicy,
  status: z.enum(["idle","recording","uploaded","processing","completed","error"]).default("idle")
});
export type Session = z.infer<typeof Session>;

export const CreateLectureDTO = z.object({ title: z.string().min(1) });
export const CreateSessionDTO = z.object({
  mode: SessionMode.default("manual"),
  policy: SegmentPolicy.partial().default({})
});
export const PatchSessionDTO = z.object({
  mode: SessionMode.optional(),
  policy: SegmentPolicy.partial().optional()
});

export const ApiResponse = <T>(data: T) => ({ ok: true, data });

// --- Validators ---
export * from "./validators";

// --- Slides ---
export * from "./slides";

// --- Summary ---
export * from "./summary";

// --- Transcript ---
export * from "./transcript";
