import React from 'react';
import { RecordingControl } from './RecordingControl';
import { btnSecondary } from '../../styles/constants';

interface RecordingModeProps {
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
  onBack: () => void;
}

export function RecordingMode({
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
  onBack,
}: RecordingModeProps) {
  return (
    <div style={{ width: '100%', maxWidth: 800, marginTop: 32 }}>
      {/* Back Button */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={onBack} style={btnSecondary}>
          ← 뒤로 가기
        </button>
      </div>

      {/* Recording Control */}
      <RecordingControl
        recording={recording}
        paused={paused}
        pending={pending}
        recordingCompleted={recordingCompleted}
        currentSessionId={currentSessionId}
        recordingTime={recordingTime}
        onStartRecording={onStartRecording}
        onPauseRecording={onPauseRecording}
        onResumeRecording={onResumeRecording}
        onStopRecording={onStopRecording}
      />
    </div>
  );
}
