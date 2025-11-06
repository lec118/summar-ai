import React from "react";
import { useRouter } from "next/navigation";

interface RecordingControlProps {
  recording: boolean;
  paused: boolean;
  pending: boolean;
  recordingCompleted: boolean;
  currentSessionId: string | null;
  recordingTime: number;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function RecordingControl({
  recording,
  paused,
  pending,
  recordingCompleted,
  currentSessionId,
  recordingTime,
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
          /* Stage 0.5: Currently recording - show recording indicator and small buttons */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 32,
              padding: "32px",
            }}
          >
            {/* Recording Indicator */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              {/* Status with breathing dot */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                {/* Breathing green dot */}
                {!paused && (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "#27ae60",
                      animation: "breathe 2s ease-in-out infinite",
                      boxShadow: "0 0 20px rgba(39, 174, 96, 0.8)",
                    }}
                  />
                )}
                {paused && (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "#f39c12",
                      boxShadow: "0 0 20px rgba(243, 156, 18, 0.8)",
                    }}
                  />
                )}
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {paused ? "녹음 일시정지 중" : "녹음 진행 중"}
                </div>
              </div>

              {/* Recording Time */}
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: "#fff",
                  fontFamily: "monospace",
                  letterSpacing: "0.1em",
                  opacity: 0.95,
                }}
              >
                {formatTime(recordingTime)}
              </div>
            </div>

            {/* Control Buttons */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 8,
              }}
            >
              {/* Pause/Resume Button */}
              {!paused ? (
                <button
                  onClick={onPauseRecording}
                  style={{
                    padding: "12px 24px",
                    background: "#f39c12",
                    color: "#fff",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.2s",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
                  }}
                >
                  <span style={{ fontSize: 18 }}>⏸️</span>
                  녹음 중지
                </button>
              ) : (
                <button
                  onClick={onResumeRecording}
                  style={{
                    padding: "12px 24px",
                    background: "#27ae60",
                    color: "#fff",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.2s",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
                  }}
                >
                  <span style={{ fontSize: 18 }}>▶️</span>
                  녹음 재개
                </button>
              )}

              {/* Stop Button */}
              <button
                onClick={onStopRecording}
                style={{
                  padding: "12px 24px",
                  background: "#c0392b",
                  color: "#fff",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
                }}
              >
                <span style={{ fontSize: 18 }}>⏹️</span>
                녹음 종료
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
