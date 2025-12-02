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

        // Directly fetch session by ID (optimized - no N+1 query)
        const foundSession = await apiRequest<Session>(`/sessions/${sessionId}`);

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

    // Poll only when page is visible
    let interval: NodeJS.Timeout | null = null;

    const poll = async () => {
      try {
        // Directly fetch session - optimized (no N+1 query)
        const foundSession = await apiRequest<Session>(`/sessions/${sessionId}`);

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
    };

    const startPolling = () => {
      if (!interval) {
        interval = setInterval(poll, 5000);
      }
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
        poll(); // Poll immediately when page becomes visible
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Start polling if page is visible
    if (!document.hidden) {
      startPolling();
    }

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session?.status, sessionId, setSession, setTranscript]);
}

export function useTranscription(sessionId: string, session: Session | null, setSession: (session: Session) => void, setError: (error: string | null) => void) {
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionStep, setTranscriptionStep] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  async function startTranscription() {
    if (!session) {
      console.error("[Transcription] No session found");
      setError("세션을 찾을 수 없습니다.");
      return;
    }

    try {
      setTranscribing(true);
      setError(null);
      setTranscriptionStep("서버에 요청 전송 중...");

      const startTime = Date.now();
      await apiRequest(`/sessions/${sessionId}/ingest`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const duration = Date.now() - startTime;

      console.log(`[Transcription] Started successfully (${duration}ms)`);
      setTranscriptionStep("요청 완료! 상태 업데이트 중...");

      setSession({ ...session, status: "processing" });
      setTranscriptionStep("");

      // Show success message instead of alert
      setSuccessMessage("텍스트 변환이 시작되었습니다. 작업이 완료되면 페이지가 자동으로 업데이트됩니다.");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("[Transcription] Error:", err);

      const errorMessage = err instanceof Error ? err.message : "텍스트 변환을 시작할 수 없습니다.";
      setError(errorMessage);
      setTranscriptionStep("");
      setTranscribing(false);
    }
  }

  return { transcribing, transcriptionStep, successMessage, startTranscription };
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
      const errorMessage = err instanceof Error ? err.message : "요약 생성에 실패했습니다. 잠시 후 다시 시도해주세요.";
      setError(errorMessage);
      // alert(errorMessage); // Removed alert to rely on UI error display
    } finally {
      setSummarizing(false);
    }
  }

  return { summarizing, generateSummary };
}
