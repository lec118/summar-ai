import type { SummaryReport } from "@summa/shared";

const store = new Map<string, SummaryReport>();

export function saveSummary(report: SummaryReport) {
  store.set(report.sessionId, report);
}

export function getSummary(sessionId: string) {
  return store.get(sessionId);
}