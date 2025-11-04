import { z } from "zod";
// ========================================
// Route Parameter Validators
// ========================================
export const UUIDSchema = z.string().uuid("Invalid UUID format");
export const RouteParamsSchemas = {
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
// ========================================
// File Upload Validators
// ========================================
export const ALLOWED_AUDIO_MIMES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/webm',
    'audio/mp4',
    'audio/m4a',
    'audio/ogg',
    'video/mp4', // Sometimes audio recordings are video/mp4
    'video/webm'
];
export const ALLOWED_PDF_MIMES = [
    'application/pdf'
];
export const FileValidators = {
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
// ========================================
// Worker Job Data Validators
// ========================================
export const TranscribeJobSchema = z.object({
    segmentId: UUIDSchema,
    sessionId: UUIDSchema,
    lectureId: UUIDSchema,
    localPath: z.string().min(1)
});
export const SummarizeJobSchema = z.object({
    sessionId: UUIDSchema,
    deckId: UUIDSchema.optional()
});
// ========================================
// Query Parameter Validators
// ========================================
export const PaginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10)
});
// Helper to create typed responses
export const createApiResponse = {
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
