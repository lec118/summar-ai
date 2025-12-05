"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lecture } from "@summa/shared";
import { History, Library } from "lucide-react";
import { useLectures, useSessions, useRecording, useFileUpload } from "./hooks/useHome";
import { LectureSelector } from "./components/home/LectureSelector";
import { ModeSelection } from "./components/home/ModeSelection";
import { RecordingMode } from "./components/home/RecordingMode";
import { FileUploadMode } from "./components/home/FileUploadMode";
import { SessionHistoryModal } from "./components/home/SessionHistoryModal";

type Mode = 'recording' | 'upload' | null;

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

  // Mode selection state
  const [selectedMode, setSelectedMode] = useState<Mode>(null);

  // Recording hooks
  const recording = useRecording(activeLecture, createSession);
  const fileUpload = useFileUpload(activeLecture, createSession);

  // Extract recordingTime for RecordingMode component
  const { recordingTime } = recording;

  // Reset completion states when lecture changes
  const handleLectureChange = (lecture: Lecture | null) => {
    setActiveLecture(lecture);
    setSelectedMode(null); // Reset mode when lecture changes
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
    <main className="main-container">
      <div className="text-center mb-16 animate-float">
        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.2 }} className="tracking-tight">
          Summa AI
          <span className="text-violet-500 ml-2">.</span>
        </h1>
        <p className="text-slate-400 text-xl max-w-2xl mx-auto leading-relaxed font-medium">
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

      {/* Mode Selection or Selected Mode UI */}
      {activeLecture && (
        <>
          {/* History Button */}
          <div className="w-full max-w-4xl mt-8 mb-4 flex justify-end">
            <button
              onClick={() => setShowHistoryPopup(true)}
              className="btn btn-secondary"
            >
              <History className="w-5 h-5 mr-2" />
              녹음 기록
            </button>
          </div>

          {/* Mode Selection Screen */}
          {!selectedMode && (
            <ModeSelection
              onSelectRecording={() => setSelectedMode('recording')}
              onSelectUpload={() => setSelectedMode('upload')}
            />
          )}

          {/* Recording Mode */}
          {selectedMode === 'recording' && (
            <RecordingMode
              recording={recording.recording}
              paused={recording.paused}
              pending={pending}
              recordingCompleted={recording.recordingCompleted}
              currentSessionId={currentSessionId}
              recordingTime={recordingTime}
              onStartRecording={recording.startRecording}
              onPauseRecording={recording.pauseRecording}
              onResumeRecording={recording.resumeRecording}
              onStopRecording={recording.stopRecording}
              onBack={() => setSelectedMode(null)}
            />
          )}

          {/* File Upload Mode */}
          {selectedMode === 'upload' && (
            <FileUploadMode
              fileInputRef={fileUpload.fileInputRef}
              uploadingFile={fileUpload.uploadingFile}
              fileUploaded={fileUpload.fileUploaded}
              currentSessionId={fileUpload.currentSessionId}
              onFileSelect={fileUpload.handleFileSelect}
              onBack={() => setSelectedMode(null)}
              onNavigateToSession={() => {
                if (currentSessionId) {
                  router.push(`/sessions/${currentSessionId}`);
                }
              }}
            />
          )}
        </>
      )}

      {/* Empty State when no lecture selected */}
      {!activeLecture && (
        <div className="empty-state glass-panel flex flex-col items-center">
          <Library className="w-16 h-16 mb-6 text-slate-600" />
          <h3 className="text-2xl font-bold mb-3 text-white">
            강의를 선택하거나 생성하세요
          </h3>
          <p className="text-slate-400 text-lg">
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
