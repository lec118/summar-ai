import { z } from 'zod';

declare const UUIDSchema: z.ZodString;
declare const RouteParamsSchemas: {
    lectureId: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    sessionId: z.ZodObject<{
        sid: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        sid: string;
    }, {
        sid: string;
    }>;
    lectureAndSession: z.ZodObject<{
        id: z.ZodString;
        sid: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        sid: string;
    }, {
        id: string;
        sid: string;
    }>;
};
declare const ALLOWED_AUDIO_MIMES: readonly ["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/webm", "audio/mp4", "audio/m4a", "audio/ogg", "video/mp4", "video/webm"];
declare const ALLOWED_PDF_MIMES: readonly ["application/pdf"];
declare const FileValidators: {
    isAllowedAudioType: (mimetype: string) => boolean;
    isAllowedPDFType: (mimetype: string) => boolean;
    validateFileSize: (size: number, maxMB: number) => {
        valid: boolean;
        error?: string;
    };
};
declare const TranscribeJobSchema: z.ZodObject<{
    segmentId: z.ZodString;
    sessionId: z.ZodString;
    lectureId: z.ZodString;
    localPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    lectureId: string;
    segmentId: string;
    sessionId: string;
    localPath: string;
}, {
    lectureId: string;
    segmentId: string;
    sessionId: string;
    localPath: string;
}>;
declare const SummarizeJobSchema: z.ZodObject<{
    sessionId: z.ZodString;
    deckId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    deckId?: string | undefined;
}, {
    sessionId: string;
    deckId?: string | undefined;
}>;
type TranscribeJobData = z.infer<typeof TranscribeJobSchema>;
type SummarizeJobData = z.infer<typeof SummarizeJobSchema>;
declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
type PaginationParams = z.infer<typeof PaginationSchema>;
interface ApiError {
    ok: false;
    error: string;
    details?: unknown;
}
interface ApiSuccess<T = unknown> {
    ok: true;
    data: T;
}
type ApiResponseType<T = unknown> = ApiSuccess<T> | ApiError;
declare const createApiResponse: {
    success: <T>(data: T) => ApiSuccess<T>;
    error: (error: string, details?: unknown) => ApiError;
};

declare const SlidePage: z.ZodObject<{
    page: z.ZodNumber;
    text: z.ZodDefault<z.ZodString>;
    vector: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    page: number;
    text: string;
    vector: number[];
}, {
    page: number;
    text?: string | undefined;
    vector?: number[] | undefined;
}>;
type SlidePage = z.infer<typeof SlidePage>;
declare const SlideDeck: z.ZodObject<{
    id: z.ZodString;
    lectureId: z.ZodString;
    title: z.ZodString;
    pages: z.ZodArray<z.ZodObject<{
        page: z.ZodNumber;
        text: z.ZodDefault<z.ZodString>;
        vector: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        text: string;
        vector: number[];
    }, {
        page: number;
        text?: string | undefined;
        vector?: number[] | undefined;
    }>, "many">;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    createdAt: number;
    lectureId: string;
    pages: {
        page: number;
        text: string;
        vector: number[];
    }[];
}, {
    id: string;
    title: string;
    createdAt: number;
    lectureId: string;
    pages: {
        page: number;
        text?: string | undefined;
        vector?: number[] | undefined;
    }[];
}>;
type SlideDeck = z.infer<typeof SlideDeck>;

declare const SummaryItem: z.ZodObject<{
    id: z.ZodString;
    level: z.ZodDefault<z.ZodEnum<["segment", "overall"]>>;
    text: z.ZodString;
    evidence_ids: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    score: z.ZodDefault<z.ZodNumber>;
    startMs: z.ZodOptional<z.ZodNumber>;
    endMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
    level: "segment" | "overall";
    evidence_ids: string[];
    score: number;
    startMs?: number | undefined;
    endMs?: number | undefined;
}, {
    id: string;
    text: string;
    level?: "segment" | "overall" | undefined;
    evidence_ids?: string[] | undefined;
    score?: number | undefined;
    startMs?: number | undefined;
    endMs?: number | undefined;
}>;
type SummaryItem = z.infer<typeof SummaryItem>;
declare const SummaryReport: z.ZodObject<{
    sessionId: z.ZodString;
    deckId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        level: z.ZodDefault<z.ZodEnum<["segment", "overall"]>>;
        text: z.ZodString;
        evidence_ids: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        score: z.ZodDefault<z.ZodNumber>;
        startMs: z.ZodOptional<z.ZodNumber>;
        endMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
        level: "segment" | "overall";
        evidence_ids: string[];
        score: number;
        startMs?: number | undefined;
        endMs?: number | undefined;
    }, {
        id: string;
        text: string;
        level?: "segment" | "overall" | undefined;
        evidence_ids?: string[] | undefined;
        score?: number | undefined;
        startMs?: number | undefined;
        endMs?: number | undefined;
    }>, "many">;
    metrics: z.ZodObject<{
        coverage: z.ZodNumber;
        avgAlignScore: z.ZodNumber;
        evidenceCoverage: z.ZodNumber;
        hallucinationRate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        coverage: number;
        avgAlignScore: number;
        evidenceCoverage: number;
        hallucinationRate: number;
    }, {
        coverage: number;
        avgAlignScore: number;
        evidenceCoverage: number;
        hallucinationRate: number;
    }>;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    createdAt: number;
    sessionId: string;
    deckId: string;
    items: {
        id: string;
        text: string;
        level: "segment" | "overall";
        evidence_ids: string[];
        score: number;
        startMs?: number | undefined;
        endMs?: number | undefined;
    }[];
    metrics: {
        coverage: number;
        avgAlignScore: number;
        evidenceCoverage: number;
        hallucinationRate: number;
    };
}, {
    createdAt: number;
    sessionId: string;
    deckId: string;
    items: {
        id: string;
        text: string;
        level?: "segment" | "overall" | undefined;
        evidence_ids?: string[] | undefined;
        score?: number | undefined;
        startMs?: number | undefined;
        endMs?: number | undefined;
    }[];
    metrics: {
        coverage: number;
        avgAlignScore: number;
        evidenceCoverage: number;
        hallucinationRate: number;
    };
}>;
type SummaryReport = z.infer<typeof SummaryReport>;

declare const TranscriptParagraphSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    startMs: z.ZodOptional<z.ZodNumber>;
    endMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
    startMs?: number | undefined;
    endMs?: number | undefined;
}, {
    id: string;
    text: string;
    startMs?: number | undefined;
    endMs?: number | undefined;
}>;
type TranscriptParagraph = z.infer<typeof TranscriptParagraphSchema>;
declare const TranscriptionResultSchema: z.ZodObject<{
    segmentId: z.ZodString;
    lectureId: z.ZodOptional<z.ZodString>;
    paragraphs: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        startMs: z.ZodOptional<z.ZodNumber>;
        endMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
        startMs?: number | undefined;
        endMs?: number | undefined;
    }, {
        id: string;
        text: string;
        startMs?: number | undefined;
        endMs?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    segmentId: string;
    paragraphs: {
        id: string;
        text: string;
        startMs?: number | undefined;
        endMs?: number | undefined;
    }[];
    lectureId?: string | undefined;
}, {
    segmentId: string;
    paragraphs: {
        id: string;
        text: string;
        startMs?: number | undefined;
        endMs?: number | undefined;
    }[];
    lectureId?: string | undefined;
}>;
type TranscriptionResultPayload = z.infer<typeof TranscriptionResultSchema>;

/** --- Domain Types --- */
declare const Lecture: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    createdAt: number;
}, {
    id: string;
    title: string;
    createdAt: number;
}>;
type Lecture = z.infer<typeof Lecture>;
declare const SessionMode: z.ZodEnum<["manual", "auto"]>;
type SessionMode = z.infer<typeof SessionMode>;
declare const SegmentPolicy: z.ZodObject<{
    lengthMin: z.ZodDefault<z.ZodNumber>;
    overlapSec: z.ZodDefault<z.ZodNumber>;
    vadPause: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    lengthMin: number;
    overlapSec: number;
    vadPause: boolean;
}, {
    lengthMin?: number | undefined;
    overlapSec?: number | undefined;
    vadPause?: boolean | undefined;
}>;
type SegmentPolicy = z.infer<typeof SegmentPolicy>;
declare const Session: z.ZodObject<{
    id: z.ZodString;
    lectureId: z.ZodString;
    idx: z.ZodNumber;
    mode: z.ZodEnum<["manual", "auto"]>;
    policy: z.ZodObject<{
        lengthMin: z.ZodDefault<z.ZodNumber>;
        overlapSec: z.ZodDefault<z.ZodNumber>;
        vadPause: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        lengthMin: number;
        overlapSec: number;
        vadPause: boolean;
    }, {
        lengthMin?: number | undefined;
        overlapSec?: number | undefined;
        vadPause?: boolean | undefined;
    }>;
    status: z.ZodDefault<z.ZodEnum<["idle", "recording", "uploaded", "processing", "completed", "error"]>>;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: number;
    status: "idle" | "recording" | "uploaded" | "processing" | "completed" | "error";
    lectureId: string;
    idx: number;
    mode: "manual" | "auto";
    policy: {
        lengthMin: number;
        overlapSec: number;
        vadPause: boolean;
    };
}, {
    id: string;
    createdAt: number;
    lectureId: string;
    idx: number;
    mode: "manual" | "auto";
    policy: {
        lengthMin?: number | undefined;
        overlapSec?: number | undefined;
        vadPause?: boolean | undefined;
    };
    status?: "idle" | "recording" | "uploaded" | "processing" | "completed" | "error" | undefined;
}>;
type Session = z.infer<typeof Session>;
declare const CreateLectureDTO: z.ZodObject<{
    title: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
}, {
    title: string;
}>;
declare const CreateSessionDTO: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["manual", "auto"]>>;
    policy: z.ZodDefault<z.ZodObject<{
        lengthMin: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        overlapSec: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        vadPause: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        lengthMin?: number | undefined;
        overlapSec?: number | undefined;
        vadPause?: boolean | undefined;
    }, {
        lengthMin?: number | undefined;
        overlapSec?: number | undefined;
        vadPause?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    mode: "manual" | "auto";
    policy: {
        lengthMin?: number | undefined;
        overlapSec?: number | undefined;
        vadPause?: boolean | undefined;
    };
}, {
    mode?: "manual" | "auto" | undefined;
    policy?: {
        lengthMin?: number | undefined;
        overlapSec?: number | undefined;
        vadPause?: boolean | undefined;
    } | undefined;
}>;
declare const PatchSessionDTO: z.ZodObject<{
    mode: z.ZodOptional<z.ZodEnum<["manual", "auto"]>>;
    policy: z.ZodOptional<z.ZodObject<{
        lengthMin: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        overlapSec: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        vadPause: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        lengthMin?: number | undefined;
        overlapSec?: number | undefined;
        vadPause?: boolean | undefined;
    }, {
        lengthMin?: number | undefined;
        overlapSec?: number | undefined;
        vadPause?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    mode?: "manual" | "auto" | undefined;
    policy?: {
        lengthMin?: number | undefined;
        overlapSec?: number | undefined;
        vadPause?: boolean | undefined;
    } | undefined;
}, {
    mode?: "manual" | "auto" | undefined;
    policy?: {
        lengthMin?: number | undefined;
        overlapSec?: number | undefined;
        vadPause?: boolean | undefined;
    } | undefined;
}>;
declare const ApiResponse: <T>(data: T) => {
    ok: boolean;
    data: T;
};

export { ALLOWED_AUDIO_MIMES, ALLOWED_PDF_MIMES, type ApiError, ApiResponse, type ApiResponseType, type ApiSuccess, CreateLectureDTO, CreateSessionDTO, FileValidators, Lecture, type PaginationParams, PaginationSchema, PatchSessionDTO, RouteParamsSchemas, SegmentPolicy, Session, SessionMode, SlideDeck, SlidePage, type SummarizeJobData, SummarizeJobSchema, SummaryItem, SummaryReport, type TranscribeJobData, TranscribeJobSchema, type TranscriptParagraph, TranscriptParagraphSchema, type TranscriptionResultPayload, TranscriptionResultSchema, UUIDSchema, createApiResponse };
