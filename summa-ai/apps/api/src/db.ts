import type { Lecture, Session } from "@summa/shared";
import { randomUUID } from "crypto";

export type SessionSegment = {
  id: string;
  sessionId: string;
  localPath?: string;
  createdAt: number;
};

export const mem = {
  lectures: new Map<string, Lecture>(),
  sessions: new Map<string, Session[]>(), // key: lectureId
  segments: new Map<string, SessionSegment[]>(), // key: sessionId
};

const processingJobs = new Map<string, number>(); // key: sessionId -> remaining jobs

export function createLecture(title: string): Lecture {
  const lec = { id: randomUUID(), title, createdAt: Date.now() } as Lecture;
  mem.lectures.set(lec.id, lec);
  mem.sessions.set(lec.id, []);
  return lec;
}

export function createSession(lectureId: string, partial: Partial<Session>): Session {
  const list = mem.sessions.get(lectureId) ?? [];
  const idx = list.length;
  const sess: Session = {
    id: randomUUID(),
    lectureId,
    idx,
    mode: partial.mode ?? "manual",
    policy: {
      lengthMin: partial.policy?.lengthMin ?? 55,
      overlapSec: partial.policy?.overlapSec ?? 5,
      vadPause: partial.policy?.vadPause ?? true
    },
    status: "idle"
  };
  list.push(sess);
  mem.sessions.set(lectureId, list);
  mem.segments.set(sess.id, []);
  return sess;
}

export function registerSegment(sessionId: string, segment: Omit<SessionSegment, "sessionId" | "createdAt"> & { createdAt?: number }) {
  const segs = mem.segments.get(sessionId) ?? [];
  const next: SessionSegment = {
    createdAt: segment.createdAt ?? Date.now(),
    sessionId,
    ...segment
  };
  segs.push(next);
  mem.segments.set(sessionId, segs);

  const context = findSessionById(sessionId);
  if (context && context.session.status !== "processing" && context.session.status !== "completed") {
    context.session.status = "uploaded";
  }

  return next;
}

export function getSegments(sessionId: string) {
  return [...(mem.segments.get(sessionId) ?? [])];
}

export function patchSession(lectureId: string, sid: string, update: Partial<Session>) {
  const list = mem.sessions.get(lectureId) ?? [];
  const i = list.findIndex(s => s.id === sid);
  if (i < 0) return null;
  const cur = list[i];
  const next: Session = {
    ...cur,
    mode: update.mode ?? cur.mode,
    policy: {
      lengthMin: update.policy?.lengthMin ?? cur.policy.lengthMin,
      overlapSec: update.policy?.overlapSec ?? cur.policy.overlapSec,
      vadPause: update.policy?.vadPause ?? cur.policy.vadPause
    }
  };
  list[i] = next;
  return next;
}

export function deleteSession(lectureId: string, sid: string): boolean {
  const list = mem.sessions.get(lectureId) ?? [];
  const i = list.findIndex(s => s.id === sid);
  if (i < 0) return false;

  // Remove session from list
  list.splice(i, 1);
  mem.sessions.set(lectureId, list);

  // Clean up segments
  mem.segments.delete(sid);

  return true;
}

export function findSessionById(sessionId: string):
  | { lectureId: string; session: Session }
  | null {
  for (const [lectureId, list] of mem.sessions.entries()) {
    const session = list.find((s) => s.id === sessionId);
    if (session) {
      return { lectureId, session };
    }
  }
  return null;
}

export function markProcessingJobs(sessionId: string, jobCount: number) {
  processingJobs.set(sessionId, jobCount);
}

export function resolveProcessingJob(sessionId: string): number {
  if (!processingJobs.has(sessionId)) {
    const context = findSessionById(sessionId);
    if (context) {
      context.session.status = "completed";
    }
    return 0;
  }

  const remaining = (processingJobs.get(sessionId) ?? 0) - 1;
  if (remaining <= 0) {
    processingJobs.delete(sessionId);
    const context = findSessionById(sessionId);
    if (context) {
      context.session.status = "completed";
    }
    return 0;
  }

  processingJobs.set(sessionId, remaining);
  return remaining;
}
