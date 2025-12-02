"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lecture } from "@summa/shared";
import { useLectures, useSessions, useRecording, useFileUpload } from "./hooks/useHome";
import { LectureSelector } from "./components/home/LectureSelector";
import { RecordingControl } from "./components/home/RecordingControl";
import { SessionHistoryModal } from "./components/home/SessionHistoryModal";
import { mainStyle, btnSecondary, emptyStateStyle } from "./styles/constants";

export default function Home() {
  const router = useRouter();

  // Lecture state
  const { lectures, error, createLecture } = useLectures();
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [showNewLectureForm, setShowNewLectureForm] = useState(false);
  const [newLectureTitle, setNewLectureTitle] = useState("");
  const [pending, setPending] = useState(false);

  // Session state
  const { sessions, createSession, deleteSession } = useSessions(activeLecture);
  const [showHistoryPopup, setShowHistoryPopup] = useState(false);

  // Recording hooks
  const recording = useRecording(activeLecture, createSession);
  const fileUpload = useFileUpload(activeLecture, createSession);

  // Reset completion states when lecture changes
  const handleLectureChange = (lecture: Lecture | null) => {
    setActiveLecture(lecture);
    recording.setRecordingCompleted(false);
    fileUpload.setFileUploaded(false);
  };

  async function handleCreateLecture() {
    if (!newLectureTitle.trim()) return;

    setPending(true);
    const lecture = await createLecture(newLectureTitle);
    setPending(false);

    if (lecture) {
      setActiveLecture(lecture);
      setNewLectureTitle("");
      setShowNewLectureForm(false);
    }
  }

  // Compute combined session ID for navigation
  const currentSessionId = recording.currentSessionId || fileUpload.currentSessionId;

  return (
    <main style={mainStyle}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <h1 style={{ 
          fontSize: 56, 
          marginBottom: 24, 
          fontWeight: 800,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
          lineHeight: 1.2
        }}>
          Summa AI
          <span style={{ color: "var(--primary-color)", marginLeft: 8 }}>.</span>
        </h1>
        <p style={{ 
          color: "var(--text-secondary)", 
          fontSize: 20,
          maxWidth: 600,
          margin: "0 auto",
          lineHeight: 1.6,
          fontWeight: 500
        }}>
          강의를 녹음하고 자동으로 텍스트 변환 및 요약을 생성합니다
        </p>
      </div>

      {/* Lecture Selection */}
      <LectureSelector
        lectures={lectures}
        activeLecture={activeLecture}
        showNewLectureForm={showNewLectureForm}
        newLectureTitle={newLectureTitle}
        pending={pending}
        onSelectLecture={handleLectureChange}
        onShowNewForm={() => setShowNewLectureForm(true)}
        onHideNewForm={() => {
          setShowNewLectureForm(false);
          setNewLectureTitle("");
        }}
        onTitleChange={setNewLectureTitle}
        onCreateLecture={handleCreateLecture}
      />

      {/* Recording Actions - Only show when lecture is selected */}
      {activeLecture && (
        <div style={{ width: '100%', maxWidth: 800, marginTop: 32 }}>
          {/* History Button - Above the recording frame */}
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => setShowHistoryPopup(true)}
              style={btnSecondary}
            >
              📋 녹음 기록
            </button>
          </div>

          <RecordingControl
            recording={recording.recording}
            paused={recording.paused}
            pending={pending}
            recordingCompleted={recording.recordingCompleted}
            currentSessionId={currentSessionId}
            recordingTime={recording.recordingTime}
            onStartRecording={recording.startRecording}
            onPauseRecording={recording.pauseRecording}
            onResumeRecording={recording.resumeRecording}
            onStopRecording={recording.stopRecording}
          />
        </div>
      )}

      {/* Empty State when no lecture selected */}
      {!activeLecture && (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>📚</div>
          <h3 style={{ fontSize: 24, marginBottom: 12, fontWeight: 700, color: "var(--text-primary)" }}>
            강의를 선택하거나 생성하세요
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 17 }}>
            위에서 "새 강의 만들기" 버튼을 눌러 시작하세요
          </p>
        </div>
      )}

      {/* History Popup Modal */}
      <SessionHistoryModal
        show={showHistoryPopup && !!activeLecture}
        sessions={sessions}
        onClose={() => setShowHistoryPopup(false)}
        onSessionClick={(sessionId) => router.push(`/sessions/${sessionId}`)}
        onDeleteSession={deleteSession}
      />
    </main>
  );
}
