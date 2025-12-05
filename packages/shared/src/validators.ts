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
  'audio/x-wav',
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/aacp',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
  'video/mp4', // Sometimes audio recordings are video/mp4
  'video/webm'
] as const;

export const ALLOWED_PDF_MIMES = [
  'application/pdf'
] as const;

export const FileValidators = {
  isAllowedAudioType: (mimetype: string): boolean => {
    return ALLOWED_AUDIO_MIMES.includes(mimetype as any);
  },

  isAllowedPDFType: (mimetype: string): boolean => {
    return ALLOWED_PDF_MIMES.includes(mimetype as any);
  },

  validateFileSize: (size: number, maxMB: number): { valid: boolean; error?: string } => {
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

export type TranscribeJobData = z.infer<typeof TranscribeJobSchema>;
export type SummarizeJobData = z.infer<typeof SummarizeJobSchema>;

// ========================================
// Query Parameter Validators
// ========================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

export type PaginationParams = z.infer<typeof PaginationSchema>;

// ========================================
// Generic Response Wrapper
// ========================================

export interface ApiError {
  ok: false;
  error: string;
  details?: unknown;
}

export interface ApiSuccess<T = unknown> {
  ok: true;
  data: T;
}

export type ApiResponseType<T = unknown> = ApiSuccess<T> | ApiError;

// Helper to create typed responses
export const createApiResponse = {
  success: <T>(data: T): ApiSuccess<T> => ({
    ok: true,
    data
  }),

  error: (error: string, details?: unknown): ApiError => ({
    ok: false,
    error,
    details
  })
};
