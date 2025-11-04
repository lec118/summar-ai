import React from "react";
import { useRouter } from "next/navigation";

interface RecordingControlProps {
  recording: boolean;
  paused: boolean;
  pending: boolean;
  recordingCompleted: boolean;
  currentSessionId: string | null;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void;
}

export function RecordingControl({
  recording,
  paused,
  pending,
  recordingCompleted,
  currentSessionId,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
}: RecordingControlProps) {
  const router = useRouter();

  return (
    <div
      style={{
        marginBottom: 40,
        padding: 32,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: 16,
        position: "relative",
      }}
    >

      <div
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 24,
              marginBottom: 8,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            🎙️ 1단계: 음성 녹음
            {recordingCompleted && (
              <span
                style={{
                  padding: "6px 16px",
                  background: "#27ae60",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                ✓ 완료
              </span>
            )}
          </h2>
          <p style={{ opacity: 0.9, fontSize: 14, maxWidth: 600 }}>
            마이크를 사용해서 실시간으로 녹음하세요
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Stage 1: Recording completed - show next step button */}
        {recordingCompleted ? (
          <div
            style={{
              padding: "32px 48px",
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 320,
              gap: 16,
            }}
          >
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
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
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
            disabled={pending}
            onClick={onStartRecording}
            style={{
              padding: "48px 64px",
              background: "#e74c3c",
              color: "#fff",
              borderRadius: 20,
              border: "none",
              cursor: pending ? "not-allowed" : "pointer",
              fontSize: 16,
              fontWeight: 700,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              opacity: pending ? 0.5 : 1,
              minWidth: 320,
            }}
            onMouseEnter={(e) => {
              if (!pending) {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow =
                  "0 12px 32px rgba(0,0,0,0.5)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
            }}
          >
            <span style={{ fontSize: 56, marginBottom: 12 }}>🎤</span>
            <div style={{ fontSize: 22, fontWeight: 700 }}>녹음 시작</div>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>
              클릭하면 바로 녹음이 시작됩니다
            </div>
          </button>
        ) : (
          /* Stage 0.5: Currently recording - show pause/resume and stop buttons */
          <>
            {/* Pause/Resume Button */}
            {!paused ? (
              <button
                onClick={onPauseRecording}
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
                  minWidth: 280,
                }}
              >
                <span style={{ fontSize: 56, marginBottom: 12 }}>⏸️</span>
                <div style={{ fontSize: 22, fontWeight: 700 }}>녹음 중지</div>
                <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>
                  일시 정지
                </div>
              </button>
            ) : (
              <button
                onClick={onResumeRecording}
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
                  minWidth: 280,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 32px rgba(0,0,0,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(0,0,0,0.4)";
                }}
              >
                <span style={{ fontSize: 56, marginBottom: 12 }}>▶️</span>
                <div style={{ fontSize: 22, fontWeight: 700 }}>녹음 재개</div>
                <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>
                  다시 시작
                </div>
              </button>
            )}

            {/* Stop Button */}
            <button
              onClick={onStopRecording}
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
                minWidth: 280,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow =
                  "0 12px 32px rgba(0,0,0,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
              }}
            >
              <span style={{ fontSize: 56, marginBottom: 12 }}>⏹️</span>
              <div style={{ fontSize: 22, fontWeight: 700 }}>녹음 종료</div>
              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>
                완전히 종료하고 저장
              </div>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
