import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { apiRequest, apiUpload, ApiError } from "../../lib/api";
import type { Lecture, Session } from "@summa/shared";

export function useLectures() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLectures() {
      try {
        const data = await apiRequest<Lecture[]>("/lectures");
        setLectures(data);
      } catch (err) {
        console.error("Failed to fetch lectures:", err);
        setError(
          err instanceof ApiError
            ? err.message
            : "강의 목록을 불러올 수 없습니다."
        );
      }
    }
    fetchLectures();
  }, []);

  async function createLecture(title: string): Promise<Lecture | null> {
    if (!title.trim()) {
      toast.error("강의 제목을 입력해주세요.");
      return null;
    }

    try {
      setError(null);
      const lecture = await apiRequest<Lecture>("/lectures", {
        method: "POST",
        body: JSON.stringify({ title: title.trim() }),
      });

      setLectures((prev) => [lecture, ...prev]);
      return lecture;
    } catch (err) {
      console.error("Failed to create lecture:", err);
      const errorMessage =
        err instanceof ApiError ? err.message : "강의 생성에 실패했습니다.";
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }

  return { lectures, setLectures, error, setError, createLecture };
}

export function useSessions(activeLecture: Lecture | null) {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!activeLecture) return;

    const lectureId = activeLecture.id;
    let intervalId: NodeJS.Timeout | null = null;

    async function fetchSessions() {
      try {
        const data = await apiRequest<Session[]>(
          `/lectures/${lectureId}/sessions`
        );
        setSessions(data);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      }
    }

    function startPolling() {
      if (!intervalId) {
        fetchSessions(); // Fetch immediately
        intervalId = setInterval(fetchSessions, 5000);
      }
    }

    function stopPolling() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    // Handle page visibility changes
    function handleVisibilityChange() {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    }

    // Start polling if page is visible
    if (!document.hidden) {
      startPolling();
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeLecture]);

  async function createSession(
    lectureId: string,
    mode: "manual" | "auto"
  ): Promise<string | null> {
    try {
      const session = await apiRequest<Session>(
        `/lectures/${lectureId}/sessions`,
        {
          method: "POST",
          body: JSON.stringify({
            mode,
            policy: { lengthMin: 55, overlapSec: 5, vadPause: true },
          }),
        }
      );

      setSessions((prev) => [...prev, session]);
      return session.id;
    } catch (err) {
      console.error("Failed to create session:", err);
      toast.error(
        err instanceof ApiError ? err.message : "세션 생성에 실패했습니다."
      );
      return null;
    }
  }

  async function deleteSession(session: Session): Promise<void> {
    if (!confirm("이 녹음을 삭제하시겠습니까?")) return;

    try {
      await apiRequest(`/lectures/${session.lectureId}/sessions/${session.id}`, {
        method: "DELETE",
      });
      setSessions((prev) => prev.filter((x) => x.id !== session.id));
    } catch (err) {
      console.error("Failed to delete session:", err);
      toast.error(
        err instanceof ApiError ? err.message : "세션 삭제에 실패했습니다."
      );
    }
  }

  return { sessions, setSessions, createSession, deleteSession };
}

export function useRecording(
  activeLecture: Lecture | null,
  createSession: (lectureId: string, mode: "manual" | "auto") => Promise<string | null>
) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [recordingCompleted, setRecordingCompleted] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Constants
  const TIMER_UPDATE_INTERVAL_MS = 100;

  // Helper function to start timer
  const startTimer = (initialElapsedSeconds = 0) => {
    const now = Date.now();
    startTimeRef.current = now - (initialElapsedSeconds * 1000);

    if (initialElapsedSeconds === 0) {
      setRecordingTime(0);
    }

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setRecordingTime(elapsed);
    }, TIMER_UPDATE_INTERVAL_MS);
  };

  // Helper function to stop timer
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      stopTimer();

      // Stop media recorder and release resources
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        } catch (err) {
          console.error("Error cleaning up media recorder:", err);
        }
      }
    };
  }, []);

  async function startRecording(): Promise<void> {
    if (!activeLecture) {
      toast.error("먼저 강의를 선택하거나 생성하세요.");
      return;
    }

    const sessionId = await createSession(activeLecture.id, "manual");
    if (!sessionId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        toast.error("녹음 중 오류가 발생했습니다. 다시 시도해주세요.");

        // Cleanup on error
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        setRecording(false);
        setPaused(false);
        stopTimer();
        setRecordingTime(0);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");

        try {
          await apiUpload(`/sessions/${sessionId}/upload`, formData);

          // Mark as completed and store session ID
          setRecording(false);
          setRecordingCompleted(true);
          setCurrentSessionId(sessionId);
        } catch (err) {
          console.error("Upload failed:", err);
          setRecording(false);
          toast.error(
            err instanceof ApiError
              ? err.message
              : "녹음 업로드에 실패했습니다."
          );
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);

      // Start timer
      startTimer();
    } catch (err) {
      console.error("Failed to start recording:", err);
      toast.error("마이크 접근에 실패했습니다. 브라우저 권한을 확인해주세요.");
    }
  }

  function pauseRecording(): void {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.pause();
      setPaused(true);
      stopTimer();
    }
  }

  function resumeRecording(): void {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "paused") {
      recorder.resume();
      setPaused(false);

      // Resume timer from current elapsed time
      startTimer(recordingTime);
    }
  }

  function stopRecording(): void {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      mediaRecorderRef.current = null;
      setPaused(false);
      stopTimer();
      setRecordingTime(0);
      // Don't set recording to false here - let onstop handler do it
      // This prevents the "start recording" button from briefly showing
    }
  }

  return {
    recording,
    paused,
    recordingCompleted,
    currentSessionId,
    recordingTime,
    setRecordingCompleted,
    setCurrentSessionId,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
}

export function useFileUpload(
  activeLecture: Lecture | null,
  createSession: (lectureId: string, mode: "manual" | "auto") => Promise<string | null>
) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  async function handleFileSelect(
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!activeLecture) {
      toast.error("먼저 강의를 선택하거나 생성하세요.");
      return;
    }

    setUploadingFile(true);

    const sessionId = await createSession(activeLecture.id, "manual");
    if (!sessionId) {
      setUploadingFile(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      await apiUpload(`/sessions/${sessionId}/upload`, formData);

      setUploadingFile(false);

      // Mark as completed and store session ID
      setFileUploaded(true);
      setCurrentSessionId(sessionId);
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error(
        err instanceof ApiError ? err.message : "파일 업로드에 실패했습니다."
      );
      setUploadingFile(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return {
    fileInputRef,
    uploadingFile,
    fileUploaded,
    currentSessionId: currentSessionId,
    setFileUploaded,
    setCurrentSessionId,
    handleFileSelect,
  };
}
