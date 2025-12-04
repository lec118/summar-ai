import type { Lecture, Session } from "@summa/shared";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import type { Session as PrismaSession } from "@prisma/client";
import type { Redis } from "ioredis";

// ============================================================================
// CRITICAL FIX #1: Prisma Singleton Pattern
// ============================================================================
// Prevents connection pool exhaustion in development with hot reload
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================================================
// CRITICAL FIX #2: Redis-based Job Tracking
// ============================================================================
// Replaces in-memory Map that loses state on server restart

/**
 * Redis client for distributed job tracking (survives server restarts)
 * Must be initialized via setRedisClient() before use
 */
let redisClient: Redis | null = null;

/**
 * Initialize Redis client for job tracking
 * Call this from server.ts after Redis connection is established
 */
export function setRedisClient(client: Redis) {
  redisClient = client;
  console.log('✅ Redis client initialized for job tracking');
}

export type SessionSegment = {
  id: string;
  sessionId: string;
  localPath?: string;
  createdAt: number;
};

/**
 * Helper function to convert Prisma Session to shared Session type
 */
function toPrismaSession(prismaSession: PrismaSession): Session {
  return {
    id: prismaSession.id,
    lectureId: prismaSession.lectureId,
    idx: prismaSession.idx,
    mode: prismaSession.mode as "manual" | "auto",
    policy: {
      lengthMin: prismaSession.policyLengthMin,
      overlapSec: prismaSession.policyOverlapSec,
      vadPause: prismaSession.policyVadPause
    },
    status: prismaSession.status as "idle" | "recording" | "uploaded" | "processing" | "completed" | "error",
    createdAt: Number(prismaSession.createdAt)
  };
}

export async function createLecture(title: string): Promise<Lecture> {
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

export async function createSession(lectureId: string, partial: Partial<Session>): Promise<Session> {
  // Count existing sessions to determine idx
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

export async function registerSegment(
  sessionId: string,
  segment: Omit<SessionSegment, "sessionId" | "createdAt"> & { createdAt?: number }
): Promise<SessionSegment> {
  const seg = await prisma.segment.create({
    data: {
      id: segment.id,
      sessionId,
      localPath: segment.localPath,
      createdAt: BigInt(segment.createdAt ?? Date.now())
    }
  });

  // Update session status to "uploaded" if it's not already processing/completed
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
    localPath: seg.localPath ?? undefined,
    createdAt: Number(seg.createdAt)
  };
}

export async function getSegments(sessionId: string): Promise<SessionSegment[]> {
  const segments = await prisma.segment.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" }
  });

  return segments.map(seg => ({
    id: seg.id,
    sessionId: seg.sessionId,
    localPath: seg.localPath ?? undefined,
    createdAt: Number(seg.createdAt)
  }));
}

export async function patchSession(
  lectureId: string,
  sid: string,
  update: Partial<Session>
): Promise<Session | null> {
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

export async function deleteSession(lectureId: string, sid: string): Promise<boolean> {
  const existing = await prisma.session.findFirst({
    where: {
      id: sid,
      lectureId
    }
  });

  if (!existing) return false;

  // Delete session (segments will cascade)
  await prisma.session.delete({
    where: { id: sid }
  });

  return true;
}

export async function findSessionById(
  sessionId: string
): Promise<{ lectureId: string; session: Session } | null> {
  const sess = await prisma.session.findUnique({
    where: { id: sessionId }
  });

  if (!sess) return null;

  return {
    lectureId: sess.lectureId,
    session: toPrismaSession(sess)
  };
}

export async function getAllLectures(): Promise<Lecture[]> {
  const lectures = await prisma.lecture.findMany({
    orderBy: { createdAt: "desc" }
  });

  return lectures.map(lec => ({
    id: lec.id,
    title: lec.title,
    createdAt: Number(lec.createdAt)
  }));
}

export async function getSessionsByLectureId(lectureId: string): Promise<Session[]> {
  const sessions = await prisma.session.findMany({
    where: { lectureId },
    orderBy: { idx: "asc" }
  });

  return sessions.map(toPrismaSession);
}

/**
 * CRITICAL FIX: Mark the start of processing jobs for a session
 * Uses Redis for distributed state management (survives server restarts)
 *
 * @param sessionId - The session ID
 * @param jobCount - Number of jobs to track
 */
export async function markProcessingJobs(sessionId: string, jobCount: number): Promise<void> {
  if (!redisClient) {
    console.warn('⚠️  Redis client not initialized for job tracking');
    // Fallback: Still mark session as processing in database
    await prisma.session.updateMany({
      where: { id: sessionId },
      data: { status: "processing" }
    });
    return;
  }

  // Store job count in Redis with 24-hour expiration (prevents orphaned keys)
  const key = `processing:jobs:${sessionId}`;
  await redisClient.set(key, jobCount.toString(), 'EX', 86400);
  console.log(`📊 Marked ${jobCount} processing jobs for session ${sessionId}`);
}

/**
 * CRITICAL FIX: Decrement job count for a session, mark as completed when done
 * Uses atomic Redis DECR to prevent race conditions with multiple workers
 *
 * @param sessionId - The session ID
 * @returns Number of remaining jobs
 */
export async function resolveProcessingJob(sessionId: string): Promise<number> {
  if (!redisClient) {
    console.warn('⚠️  Redis client not initialized, marking session as completed');
    await prisma.session.updateMany({
      where: { id: sessionId },
      data: { status: "completed" }
    });
    return 0;
  }

  const key = `processing:jobs:${sessionId}`;

  // Atomic decrement - prevents race conditions from multiple workers
  const remaining = await redisClient.decr(key);

  console.log(`📉 Job completed for session ${sessionId}, ${Math.max(0, remaining)} remaining`);

  if (remaining <= 0) {
    // All jobs completed, mark session as done and cleanup Redis key
    await redisClient.del(key);
    await prisma.session.updateMany({
      where: { id: sessionId },
      data: { status: "completed" }
    });
    console.log(`✅ All jobs completed for session ${sessionId}`);
    return 0;
  }

  return remaining;
}
