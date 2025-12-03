import React from "react";
import { useRouter } from "next/navigation";
import { sectionStyle, btnLarge, btnIcon, btnDanger, iconCircleStyle, LAYOUT } from "../../styles/constants";
import { formatTimeFromSeconds } from "../../utils/time";

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

  if (recordingCompleted && currentSessionId) {
    return (
      <div style={{ ...sectionStyle, textAlign: "center", padding: LAYOUT.spacing.xxxl }}>
        <div style={{ fontSize: LAYOUT.iconSize.lg, marginBottom: LAYOUT.spacing.lg }}>🎉</div>
        <h3 style={{ fontSize: LAYOUT.fontSize.xxl, marginBottom: LAYOUT.spacing.sm, fontWeight: 700, color: "var(--text-primary)" }}>
          녹음이 완료되었습니다!
        </h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: LAYOUT.spacing.xl, fontSize: LAYOUT.fontSize.lg }}>
          이제 AI가 텍스트 변환과 요약을 시작합니다.
        </p>
        <button
          onClick={() => router.push(`/sessions/${currentSessionId}`)}
          style={btnLarge}
        >
          결과 확인하기 →
        </button>
      </div>
    );
  }

  return (
    <div style={{
      ...sectionStyle,
      padding: LAYOUT.spacing.xxl,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: LAYOUT.minHeight.recordingControl,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {!recording ? (
        <div style={{ textAlign: "center", width: '100%' }}>
          <div style={iconCircleStyle}>🎤</div>
          <h3 style={{ fontSize: LAYOUT.fontSize.xl + 2, fontWeight: 700, marginBottom: LAYOUT.spacing.sm, color: "var(--text-primary)" }}>
            강의 녹음 시작
          </h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: LAYOUT.spacing.xl, fontSize: LAYOUT.spacing.md }}>
            버튼을 눌러 녹음을 시작하세요.
          </p>
          <button
            onClick={onStartRecording}
            disabled={pending}
            style={btnLarge}
          >
            녹음 시작
          </button>
        </div>
      ) : (
        <div style={{ width: "100%", textAlign: "center" }}>
          {/* Status Indicator */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: LAYOUT.spacing.xs,
            padding: `${LAYOUT.spacing.xs}px ${LAYOUT.spacing.md}px`,
            background: paused ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            borderRadius: LAYOUT.borderRadius.xl,
            marginBottom: LAYOUT.spacing.xl,
            border: `1px solid ${paused ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
          }}>
            <div style={{
              width: LAYOUT.spacing.xs,
              height: LAYOUT.spacing.xs,
              borderRadius: '50%',
              background: paused ? '#EF4444' : 'var(--primary-color)',
              animation: paused ? 'none' : 'pulse 1.5s infinite'
            }} />
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: paused ? '#EF4444' : 'var(--primary-color)'
            }}>
              {paused ? "일시정지됨" : "녹음 중..."}
            </span>
          </div>

          {/* Timer */}
          <div style={{
            fontSize: LAYOUT.fontSize.timer,
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            marginBottom: LAYOUT.spacing.xxl,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            textShadow: "0 0 40px rgba(59, 130, 246, 0.2)"
          }}>
            {formatTimeFromSeconds(recordingTime)}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: LAYOUT.spacing.md, justifyContent: "center" }}>
            {!paused ? (
              <button
                onClick={onPauseRecording}
                style={{ ...btnIcon, color: "var(--text-primary)" }}
                title="일시정지"
              >
                ⏸
              </button>
            ) : (
              <button
                onClick={onResumeRecording}
                style={{ ...btnIcon, color: "var(--primary-color)" }}
                title="계속 녹음"
              >
                ▶
              </button>
            )}

            <button onClick={onStopRecording} style={btnDanger}>
              <span style={{ fontSize: LAYOUT.spacing.md }}>⏹</span> 녹음 종료
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
