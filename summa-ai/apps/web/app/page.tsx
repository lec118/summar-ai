"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, apiUpload, ApiError } from "../lib/api";
import type { Lecture, Session } from "@summa/shared";

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [activeLecture, setActiveLecture] = useState<Lecture|null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pending, setPending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showNewLectureForm, setShowNewLectureForm] = useState(false);
  const [newLectureTitle, setNewLectureTitle] = useState("");
  const [showHistoryPopup, setShowHistoryPopup] = useState(false);
  const [recordingCompleted, setRecordingCompleted] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLectures() {
      try {
        const data = await apiRequest<Lecture[]>("/lectures");
        setLectures(data);
      } catch (err) {
        console.error("Failed to fetch lectures:", err);
        setError(err instanceof ApiError ? err.message : "강의 목록을 불러올 수 없습니다.");
      }
    }
    fetchLectures();
  }, []);

  useEffect(() => {
    if (!activeLecture) return;
    // Reset completion states when lecture changes
    setRecordingCompleted(false);
    setFileUploaded(false);

    async function fetchSessions() {
      try {
        const data = await apiRequest<Session[]>(`/lectures/${activeLecture.id}/sessions`);
        setSessions(data);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      }
    }

    fetchSessions();
    const interval = setInterval(fetchSessions, 3000); // Reduced polling frequency
    return () => clearInterval(interval);
  }, [activeLecture]);

  const lecTitle = useMemo(() => activeLecture?.title ?? "?", [activeLecture]);

  async function createLecture() {
    if (!newLectureTitle.trim()) {
      alert("강의 제목을 입력해주세요.");
      return;
    }

    try {
      setPending(true);
      setError(null);

      const lecture = await apiRequest<Lecture>("/lectures", {
        method: "POST",
        body: JSON.stringify({ title: newLectureTitle.trim() })
      });

      setLectures(prev => [lecture, ...prev]);
      setActiveLecture(lecture);
      setNewLectureTitle("");
      setShowNewLectureForm(false);
    } catch (err) {
      console.error("Failed to create lecture:", err);
      setError(err instanceof ApiError ? err.message : "강의 생성에 실패했습니다.");
      alert(err instanceof ApiError ? err.message : "강의 생성에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function createSessionAndGetId(mode: "manual"|"auto"): Promise<string | null> {
    if (!activeLecture) {
      alert("먼저 강의를 선택하거나 생성하세요.");
      return null;
    }

    try {
      const session = await apiRequest<Session>(`/lectures/${activeLecture.id}/sessions`, {
        method: "POST",
        body: JSON.stringify({ mode, policy: { lengthMin: 55, overlapSec: 5, vadPause: true } })
      });

      setSessions(prev => [...prev, session]);
      return session.id;
    } catch (err) {
      console.error("Failed to create session:", err);
      alert(err instanceof ApiError ? err.message : "세션 생성에 실패했습니다.");
      return null;
    }
  }

  async function startRecording() {
    if (!activeLecture) {
      alert("먼저 강의를 선택하거나 생성하세요.");
      return;
    }

    setPending(true);
    const sessionId = await createSessionAndGetId("manual");
    if (!sessionId) {
      setPending(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

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
          alert(err instanceof ApiError ? err.message : "녹음 업로드에 실패했습니다.");
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setPending(false);
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("마이크 접근에 실패했습니다. 브라우저 권한을 확인해주세요.");
      setPending(false);
    }
  }

  function pauseRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.pause();
      setPaused(true);
    }
  }

  function resumeRecording() {
    if (mediaRecorder && mediaRecorder.state === "paused") {
      mediaRecorder.resume();
      setPaused(false);
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setRecording(false);
      setPaused(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!activeLecture) {
      alert("먼저 강의를 선택하거나 생성하세요.");
      return;
    }

    setUploadingFile(true);
    setPending(true);

    const sessionId = await createSessionAndGetId("manual");
    if (!sessionId) {
      setUploadingFile(false);
      setPending(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      await apiUpload(`/sessions/${sessionId}/upload`, formData);

      setUploadingFile(false);
      setPending(false);

      // Mark as completed and store session ID
      setFileUploaded(true);
      setCurrentSessionId(sessionId);
    } catch (err) {
      console.error("Upload failed:", err);
      alert(err instanceof ApiError ? err.message : "파일 업로드에 실패했습니다.");
      setUploadingFile(false);
      setPending(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function deleteSessionHandler(s: Session) {
    if (!confirm("이 녹음을 삭제하시겠습니까?")) return;

    try {
      await apiRequest(`/lectures/${s.lectureId}/sessions/${s.id}`, { method: "DELETE" });
      setSessions(prev => prev.filter(x => x.id !== s.id));
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert(err instanceof ApiError ? err.message : "세션 삭제에 실패했습니다.");
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, marginBottom: 8, fontWeight: 700 }}>🎤 Summa AI — 강의 녹음 자동 요약</h1>
      <p style={{ opacity: 0.7, marginBottom: 32, fontSize: 16 }}>강의를 녹음하고 자동으로 텍스트 변환 및 요약을 생성합니다</p>

      {/* Lecture Selection */}
      <div style={{ marginBottom: 40, padding: 24, background: "#0f1530", borderRadius: 16 }}>
        <h2 style={{ fontSize: 20, marginBottom: 16, fontWeight: 600 }}>📚 강의 선택</h2>

        {!showNewLectureForm ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              disabled={pending}
              onClick={() => {
                console.log("새 강의 만들기 버튼 클릭됨");
                setShowNewLectureForm(true);
              }}
              style={btnPrimary}
            >
              ➕ 새 강의 만들기
            </button>
            <select
              value={activeLecture?.id ?? ""}
              onChange={(e)=>{
                const id = e.target.value;
                const lec = lectures.find(l => l.id === id) ?? null;
                setActiveLecture(lec);
              }}
              style={select}
            >
              <option value="">기존 강의 선택...</option>
              {lectures.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
            {activeLecture && (
              <span style={{ marginLeft: 16, fontSize: 14, opacity: 0.8 }}>
                선택됨: <b style={{ color: "#5865f2" }}>{lecTitle}</b>
              </span>
            )}
          </div>
        ) : (
          <div style={{ padding: 20, background: "#192041", borderRadius: 12, border: "2px solid #5865f2" }}>
            <h3 style={{ fontSize: 18, marginBottom: 12, fontWeight: 600 }}>새 강의 만들기</h3>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                type="text"
                value={newLectureTitle}
                onChange={(e) => setNewLectureTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createLecture()}
                placeholder="강의 제목을 입력하세요..."
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: "#0f1530",
                  color: "#fff",
                  border: "1px solid #334",
                  fontSize: 15,
                  outline: "none"
                }}
                autoFocus
              />
              <button
                disabled={pending || !newLectureTitle.trim()}
                onClick={createLecture}
                style={{
                  ...btnPrimary,
                  opacity: (!newLectureTitle.trim() || pending) ? 0.5 : 1
                }}
              >
                ✓ 생성
              </button>
              <button
                onClick={() => {
                  setShowNewLectureForm(false);
                  setNewLectureTitle("");
                }}
                style={{...btnPrimary, background: "#555"}}
              >
                취소
              </button>
            </div>
            <p style={{ fontSize: 13, opacity: 0.6, marginTop: 8 }}>
              예: "2024 AI 기술 세미나", "Python 프로그래밍 강의 1주차"
            </p>
          </div>
        )}
      </div>

      {/* Recording Actions - Only show when lecture is selected */}
      {activeLecture && (
        <>
          {/* History Button - Above the recording frame */}
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowHistoryPopup(true)}
              style={{
                padding: "10px 18px",
                background: "#0f1530",
                color: "#fff",
                borderRadius: 10,
                border: "1px solid #334",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#192041";
                e.currentTarget.style.borderColor = "#5865f2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#0f1530";
                e.currentTarget.style.borderColor = "#334";
              }}
            >
              📋 녹음 기록
            </button>
          </div>

          <div style={{
            marginBottom: 40,
            padding: 32,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: 16,
            position: "relative"
          }}>
            {/* Educational Materials Upload - Top Right Inside Frame */}
            <button
              disabled={recording && !paused}
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                padding: "10px 18px",
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)",
                color: "#fff",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.3)",
                cursor: (recording && !paused) ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
                opacity: (recording && !paused) ? 0.5 : 1,
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
              onMouseEnter={(e) => {
                if (!(recording && !paused)) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.3)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.2)";
              }}
            >
              📚 교육 자료 업로드
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*,application/pdf"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

          <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 24, marginBottom: 8, fontWeight: 700, display: "flex", alignItems: "center", gap: 12 }}>
                🎙️ 1단계: 음성 녹음
                {(recordingCompleted || fileUploaded) && (
                  <span style={{
                    padding: "6px 16px",
                    background: "#27ae60",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600
                  }}>
                    ✓ 완료
                  </span>
                )}
              </h2>
              <p style={{ opacity: 0.9, fontSize: 14, maxWidth: 600 }}>
                마이크를 사용해서 실시간으로 녹음하세요
              </p>
            </div>
          </div>
          {uploadingFile && (
            <p style={{ color: "#ffd700", marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
              ⏳ 파일 업로드 중...
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            {/* Stage 1: Recording completed - show next step button */}
            {recordingCompleted || fileUploaded ? (
              <div style={{
                padding: "32px 48px",
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: 16,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 320,
                gap: 16
              }}>
                <button
                  onClick={() => {
                    if (currentSessionId) {
                      router.push(`/sessions/${currentSessionId}?autoStart=true`);
                    }
                  }}
                  style={{
                    padding: "18px 36px",
                    background: "#27ae60",
                    color: "#fff",
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 18,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "all 0.3s",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
                  }}
                >
                  다음 단계로 (텍스트 변환) →
                </button>
              </div>
            ) : !recording ? (
              /* Stage 0: Not recording - show start button */
              <button
                disabled={pending || uploadingFile}
                onClick={startRecording}
                style={{
                  padding: "48px 64px",
                  background: "#e74c3c",
                  color: "#fff",
                  borderRadius: 20,
                  border: "none",
                  cursor: (pending || uploadingFile) ? "not-allowed" : "pointer",
                  fontSize: 16,
                  fontWeight: 700,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  opacity: (pending || uploadingFile) ? 0.5 : 1,
                  minWidth: 320
                }}
                onMouseEnter={(e) => {
                  if (!pending && !uploadingFile) {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
                }}
              >
                <span style={{ fontSize: 56, marginBottom: 12 }}>🎤</span>
                <div style={{ fontSize: 22, fontWeight: 700 }}>녹음 시작</div>
                <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>클릭하면 바로 녹음이 시작됩니다</div>
              </button>
            ) : (
              /* Stage 0.5: Currently recording - show pause/resume and stop buttons */
              <>
                {/* Pause/Resume Button */}
                {!paused ? (
                  <button
                    onClick={pauseRecording}
                    style={{
                      padding: "48px 64px",
                      background: "#f39c12",
                      color: "#fff",
                      borderRadius: 20,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 16,
                      fontWeight: 700,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.3s",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                      animation: "pulse 1.5s infinite",
                      minWidth: 280
                    }}
                  >
                    <span style={{ fontSize: 56, marginBottom: 12 }}>⏸️</span>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>녹음 중지</div>
                    <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>일시 정지</div>
                  </button>
                ) : (
                  <button
                    onClick={resumeRecording}
                    style={{
                      padding: "48px 64px",
                      background: "#27ae60",
                      color: "#fff",
                      borderRadius: 20,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 16,
                      fontWeight: 700,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.3s",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                      minWidth: 280
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.05)";
                      e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
                    }}
                  >
                    <span style={{ fontSize: 56, marginBottom: 12 }}>▶️</span>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>녹음 재개</div>
                    <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>다시 시작</div>
                  </button>
                )}

                {/* Stop Button */}
                <button
                  onClick={stopRecording}
                  style={{
                    padding: "48px 64px",
                    background: "#c0392b",
                    color: "#fff",
                    borderRadius: 20,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
                    fontWeight: 700,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    minWidth: 280
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
                  }}
                >
                  <span style={{ fontSize: 56, marginBottom: 12 }}>⏹️</span>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>녹음 종료</div>
                  <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>완전히 종료하고 저장</div>
                </button>
              </>
            )}
          </div>
        </div>
        </>
      )}

      {/* Empty State when no lecture selected */}
      {!activeLecture && (
        <div style={{
          marginBottom: 40,
          padding: 48,
          background: "#0f1530",
          borderRadius: 16,
          textAlign: "center",
          border: "2px dashed #334"
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
          <h3 style={{ fontSize: 20, marginBottom: 8, opacity: 0.9 }}>강의를 선택하거나 생성하세요</h3>
          <p style={{ opacity: 0.6, fontSize: 14 }}>위에서 "새 강의 만들기" 버튼을 눌러 시작하세요</p>
        </div>
      )}

      {/* History Popup Modal */}
      {showHistoryPopup && activeLecture && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)"
          }}
          onClick={() => setShowHistoryPopup(false)}
        >
          <div
            style={{
              background: "#0f1530",
              borderRadius: 16,
              padding: 32,
              maxWidth: 900,
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700 }}>📋 녹음 기록</h2>
              <button
                onClick={() => setShowHistoryPopup(false)}
                style={{
                  padding: "8px 16px",
                  background: "#555",
                  color: "#fff",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                ✕ 닫기
              </button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", background: "#12183a", borderRadius: 12, overflow: "hidden" }}>
              <thead>
                <tr style={{ background: "#1a2045" }}>
                  <th style={th}>번호</th>
                  <th style={th}>생성 일시</th>
                  <th style={th}>상태</th>
                  <th style={th}>작업</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, idx) => (
                  <tr
                    key={s.id}
                    style={{
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                    onClick={() => {
                      setShowHistoryPopup(false);
                      router.push(`/sessions/${s.id}`);
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#1e2550"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={td}>{idx + 1}</td>
                    <td style={td}>{new Date(s.createdAt ?? Date.now()).toLocaleString('ko-KR')}</td>
                    <td style={td}>
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: 12,
                        fontSize: 13,
                        background: s.status === 'completed' ? '#27ae60' :
                                   s.status === 'processing' ? '#f39c12' : '#95a5a6',
                        color: '#fff'
                      }}>
                        {s.status === 'idle' ? '대기 중' :
                         s.status === 'processing' ? '처리 중' :
                         s.status === 'completed' ? '완료' : s.status}
                      </span>
                    </td>
                    <td style={td}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHistoryPopup(false);
                          router.push(`/sessions/${s.id}`);
                        }}
                        style={{...btnSm, background: "#27ae60"}}
                      >
                        열기
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSessionHandler(s);
                        }}
                        style={{...btnSm, background: "#e74c3c"}}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{...td, textAlign:"center", opacity:0.6, padding: 24}}>
                      아직 녹음이 없습니다. 녹음을 시작하거나 파일을 업로드하세요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </main>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "12px 20px",
  background: "#5865f2",
  color: "#fff",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 600,
  transition: "all 0.2s"
};

const btnLarge: React.CSSProperties = {
  padding: "32px 40px",
  background: "#5865f2",
  color: "#fff",
  borderRadius: 16,
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 600,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 240,
  transition: "all 0.3s",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
};

const btnSm: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  background: "#5865f2",
  marginRight: 8,
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  transition: "all 0.2s"
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  borderBottom: "2px solid #222",
  fontSize: 14,
  fontWeight: 600,
  opacity: 0.9
};

const td: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #1a2045",
  fontSize: 14
};

const select: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  background: "#192041",
  color: "#fff",
  border: "1px solid #334",
  fontSize: 15,
  cursor: "pointer",
  minWidth: 300
};
