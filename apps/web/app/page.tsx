"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lecture } from "@summa/shared";
import { useLectures, useSessions, useRecording, useFileUpload } from "./hooks/useHome";
import { LectureSelector } from "./components/home/LectureSelector";
import { RecordingControl } from "./components/home/RecordingControl";
import { SessionHistoryModal } from "./components/home/SessionHistoryModal";
import { mainStyle } from "./styles/constants";

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
      <h1 style={{ fontSize: 32, marginBottom: 8, fontWeight: 700 }}>
        🎤 Summa AI — 강의 녹음 자동 요약
      </h1>
      <p style={{ opacity: 0.7, marginBottom: 32, fontSize: 16 }}>
        강의를 녹음하고 자동으로 텍스트 변환 및 요약을 생성합니다
      </p>

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
        <>
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
                gap: 8,
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
        </>
      )}

      {/* Empty State when no lecture selected */}
      {!activeLecture && (
        <div
          style={{
            marginBottom: 40,
            padding: 48,
            background: "#0f1530",
            borderRadius: 16,
            textAlign: "center",
            border: "2px dashed #334",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
          <h3 style={{ fontSize: 20, marginBottom: 8, opacity: 0.9 }}>
            강의를 선택하거나 생성하세요
          </h3>
          <p style={{ opacity: 0.6, fontSize: 14 }}>
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

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes breathe {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.6;
          }
        }
      `}</style>
    </main>
  );
}
