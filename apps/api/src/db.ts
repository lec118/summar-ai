import type { Lecture, Session } from "@summa/shared";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type SessionSegment = {
  id: string;
  sessionId: string;
  localPath?: string;
  createdAt: number;
};

const processingJobs = new Map<string, number>(); // key: sessionId -> remaining jobs

/**
 * Helper function to convert Prisma Session to shared Session type
 */
function toPrismaSession(prismaSession: any): Session {
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

export function markProcessingJobs(sessionId: string, jobCount: number) {
  processingJobs.set(sessionId, jobCount);
}

export async function resolveProcessingJob(sessionId: string): Promise<number> {
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

export { prisma };
