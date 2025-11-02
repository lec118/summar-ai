import { z } from "zod";
/** --- Domain Types --- */
export const Lecture = z.object({
    id: z.string(),
    title: z.string(),
    createdAt: z.number()
});
export const SessionMode = z.enum(["manual", "auto"]);
export const SegmentPolicy = z.object({
    lengthMin: z.number().int().positive().default(55),
    overlapSec: z.number().int().min(0).default(5),
    vadPause: z.boolean().default(true)
});
export const Session = z.object({
    id: z.string(),
    lectureId: z.string(),
    idx: z.number().int(),
    mode: SessionMode,
    policy: SegmentPolicy,
    status: z.enum(["idle", "recording", "uploaded", "processing", "completed", "error"]).default("idle"),
    createdAt: z.number()
});
export const CreateLectureDTO = z.object({ title: z.string().min(1) });
export const CreateSessionDTO = z.object({
    mode: SessionMode.default("manual"),
    policy: SegmentPolicy.partial().default({})
});
export const PatchSessionDTO = z.object({
    mode: SessionMode.optional(),
    policy: SegmentPolicy.partial().optional()
});
export const ApiResponse = (data) => ({ ok: true, data });
// --- Validators ---
export * from "./validators";
// --- Slides ---
export * from "./slides";
// --- Summary ---
export * from "./summary";
// --- Transcript ---
export * from "./transcript";
