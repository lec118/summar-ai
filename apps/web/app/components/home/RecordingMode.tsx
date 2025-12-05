import React from 'react';
import { RecordingControl } from './RecordingControl';

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
    <div className="w-full max-w-3xl mx-auto mt-8">
      {/* Back Button */}
      <div className="mb-4">
        <button onClick={onBack} className="btn btn-secondary">
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
