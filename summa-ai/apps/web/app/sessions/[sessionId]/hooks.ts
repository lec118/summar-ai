import { useState, useEffect } from "react";
import { apiRequest, apiUpload } from "../../../lib/api";
import { Session, Segment, TranscriptParagraph, SummaryReport } from "./types";

export function useSessionData(sessionId: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [transcript, setTranscript] = useState<TranscriptParagraph[]>([]);
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessionData() {
      try {
        setLoading(true);
        setError(null);

        // Find session by iterating through lectures
        const lecturesRes = await apiRequest<any[]>("/lectures");
        let foundSession: Session | null = null;

        for (const lecture of lecturesRes) {
          const sessionsRes = await apiRequest<Session[]>(
            `/lectures/${lecture.id}/sessions`
          );
          const session = sessionsRes.find((s) => s.id === sessionId);
          if (session) {
            foundSession = session;
            break;
          }
        }

        if (!foundSession) {
          setError("세션을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        setSession(foundSession);

        // Fetch segments
        try {
          const segmentsRes = await apiRequest<Segment[]>(
            `/sessions/${sessionId}/segments`
          );
          setSegments(segmentsRes);
        } catch (err) {
          console.error("Failed to fetch segments:", err);
        }

        // Fetch transcript if available
        if (
          foundSession.status === "completed" ||
          foundSession.status === "processing"
        ) {
          try {
            const transcriptRes = await apiRequest<{
              paragraphs: TranscriptParagraph[];
            }>(`/sessions/${sessionId}/transcript`);
            setTranscript(transcriptRes.paragraphs || []);
          } catch (err) {
            console.error("Failed to fetch transcript:", err);
          }
        }

        // Fetch summary only if session is completed
        if (foundSession.status === "completed") {
          try {
            const summaryRes = await apiRequest<SummaryReport>(
              `/sessions/${sessionId}/summary`
            );
            setSummary(summaryRes);
          } catch (err) {
            console.log("No summary available yet");
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching session data:", err);
        setError(
          err instanceof Error ? err.message : "세션 데이터를 불러올 수 없습니다."
        );
        setLoading(false);
      }
    }

    fetchSessionData();
  }, [sessionId]);

  return { session, setSession, segments, transcript, setTranscript, summary, setSummary, loading, error, setError };
}

export function useSessionPolling(
  sessionId: string,
  session: Session | null,
  setSession: (session: Session) => void,
  setTranscript: (transcript: TranscriptParagraph[]) => void
) {
  useEffect(() => {
    if (!session || session.status !== "processing") return;

    const interval = setInterval(async () => {
      try {
        const lecturesRes = await apiRequest<any[]>("/lectures");
        let foundSession: Session | null = null;

        for (const lecture of lecturesRes) {
          const sessionsRes = await apiRequest<Session[]>(
            `/lectures/${lecture.id}/sessions`
          );
          const s = sessionsRes.find((s) => s.id === sessionId);
          if (s) {
            foundSession = s;
            break;
          }
        }

        if (foundSession) {
          setSession(foundSession);

          // Fetch transcript updates
          try {
            const transcriptRes = await apiRequest<{
              paragraphs: TranscriptParagraph[];
            }>(`/sessions/${sessionId}/transcript`);
            setTranscript(transcriptRes.paragraphs || []);
          } catch (err) {
            console.error("Failed to fetch transcript:", err);
          }
        }
      } catch (err) {
        console.error("Error polling session status:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [session?.status, sessionId, setSession, setTranscript]);
}

export function useTranscription(sessionId: string, session: Session | null, setSession: (session: Session) => void, setError: (error: string | null) => void) {
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionStep, setTranscriptionStep] = useState<string>("");

  async function startTranscription() {
    console.log("🎯 [Transcription] Button clicked!");
    console.log("📊 [Transcription] Current session:", session);

    if (!session) {
      console.error("❌ [Transcription] No session found!");
      setError("세션을 찾을 수 없습니다.");
      return;
    }

    try {
      console.log("🚀 [Transcription] Starting transcription process...");
      setTranscribing(true);
      setError(null);
      setTranscriptionStep("API 요청 준비 중...");

      console.log("📡 [Transcription] Sending API request to /sessions/" + sessionId + "/ingest");
      setTranscriptionStep("서버에 요청 전송 중...");

      const startTime = Date.now();
      await apiRequest(`/sessions/${sessionId}/ingest`, {
        method: "POST",
      });
      const endTime = Date.now();

      console.log(`✅ [Transcription] API request successful! (${endTime - startTime}ms)`);
      setTranscriptionStep("요청 완료! 상태 업데이트 중...");

      setSession({ ...session, status: "processing" });
      console.log("🔄 [Transcription] Session status updated to 'processing'");

      setTranscriptionStep("");
      alert("✅ 텍스트 변환이 시작되었습니다!\n\n작업이 완료되면 페이지가 자동으로 업데이트됩니다.");
    } catch (err) {
      console.error("❌ [Transcription] Error occurred:", err);
      console.error("❌ [Transcription] Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });

      const errorMessage = err instanceof Error ? err.message : "텍스트 변환을 시작할 수 없습니다.";
      setError(errorMessage);
      setTranscriptionStep("");
      setTranscribing(false);

      alert(`❌ 오류 발생\n\n${errorMessage}\n\n개발자 도구 콘솔을 확인해주세요.`);
    }
  }

  return { transcribing, transcriptionStep, startTranscription };
}

export function useSlidesUpload(sessionId: string, setError: (error: string | null) => void) {
  const [uploadingSlides, setUploadingSlides] = useState(false);

  async function uploadSlides(file: File) {
    try {
      setUploadingSlides(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      await apiUpload(`/slides/upload?sessionId=${sessionId}`, formData);

      alert("슬라이드가 성공적으로 업로드되었습니다!");
    } catch (err) {
      console.error("Failed to upload slides:", err);
      setError(
        err instanceof Error ? err.message : "슬라이드 업로드에 실패했습니다."
      );
    } finally {
      setUploadingSlides(false);
    }
  }

  return { uploadingSlides, uploadSlides };
}

export function useSummaryGeneration(
  sessionId: string,
  setSummary: (summary: SummaryReport) => void,
  setError: (error: string | null) => void
) {
  const [summarizing, setSummarizing] = useState(false);

  async function generateSummary() {
    try {
      setSummarizing(true);
      setError(null);

      const summaryRes = await apiRequest<SummaryReport>(
        `/sessions/${sessionId}/summarize`,
        {
          method: "POST",
        }
      );

      setSummary(summaryRes);
    } catch (err) {
      console.error("Failed to generate summary:", err);
      setError(
        err instanceof Error ? err.message : "요약 생성에 실패했습니다."
      );
    } finally {
      setSummarizing(false);
    }
  }

  return { summarizing, generateSummary };
}
