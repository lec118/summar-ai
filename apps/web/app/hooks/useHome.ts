import { useState, useEffect, useRef } from "react";
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
      alert("강의 제목을 입력해주세요.");
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
      alert(errorMessage);
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

    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
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
      alert(
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
      alert(
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
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [recordingCompleted, setRecordingCompleted] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  // Cleanup timer and media recorder on unmount
  useEffect(() => {
    return () => {
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop media recorder and release resources
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        try {
          mediaRecorder.stop();
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        } catch (err) {
          console.error("Error cleaning up media recorder:", err);
        }
      }
    };
  }, [mediaRecorder]);

  async function startRecording(): Promise<void> {
    if (!activeLecture) {
      alert("먼저 강의를 선택하거나 생성하세요.");
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
        alert("녹음 중 오류가 발생했습니다. 다시 시도해주세요.");

        // Cleanup on error
        stream.getTracks().forEach((track) => track.stop());
        setMediaRecorder(null);
        setRecording(false);
        setPaused(false);

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
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
          setRecordingCompleted(true);
          setCurrentSessionId(sessionId);
        } catch (err) {
          console.error("Upload failed:", err);
          alert(
            err instanceof ApiError
              ? err.message
              : "녹음 업로드에 실패했습니다."
          );
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setRecordingTime(0);

      // Start timer using timestamp-based approach for accuracy
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
        setRecordingTime(elapsed);
      }, 100); // Update more frequently for smoother display
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("마이크 접근에 실패했습니다. 브라우저 권한을 확인해주세요.");
    }
  }

  function pauseRecording(): void {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.pause();
      setPaused(true);

      // Save current time when paused
      pausedTimeRef.current = Date.now();

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }

  function resumeRecording(): void {
    if (mediaRecorder && mediaRecorder.state === "paused") {
      mediaRecorder.resume();
      setPaused(false);

      // Adjust start time to skip the pause duration
      const pauseDuration = Date.now() - pausedTimeRef.current;
      startTimeRef.current += pauseDuration;

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);
      }, 100);
    }
  }

  function stopRecording(): void {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setRecording(false);
      setPaused(false);

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
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
      alert("먼저 강의를 선택하거나 생성하세요.");
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
      alert(
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
