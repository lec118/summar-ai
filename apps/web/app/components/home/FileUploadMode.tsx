import React from 'react';
import { btnPrimary, btnSecondary } from '../../styles/constants';

interface FileUploadModeProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  uploadingFile: boolean;
  fileUploaded: boolean;
  currentSessionId: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  onNavigateToSession: () => void;
}

export function FileUploadMode({
  fileInputRef,
  uploadingFile,
  fileUploaded,
  currentSessionId,
  onFileSelect,
  onBack,
  onNavigateToSession,
}: FileUploadModeProps) {
  return (
    <div style={{ width: '100%', maxWidth: 800, marginTop: 32 }}>
      {/* Back Button */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={onBack} style={btnSecondary}>
          ← 뒤로 가기
        </button>
      </div>

      {/* Upload Container */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '2px solid var(--border-color)',
          borderRadius: 16,
          padding: '48px 32px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 24 }}>📁</div>

        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 16,
            color: 'var(--text-primary)',
          }}
        >
          음성 파일 업로드
        </h2>

        <p
          style={{
            color: 'var(--text-secondary)',
            marginBottom: 32,
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          MP3, M4A, WAV 등의 음성 파일을 업로드하세요
        </p>

        {/* Upload Status */}
        {!fileUploaded && !uploadingFile && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={onFileSelect}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                ...btnPrimary,
                fontSize: 18,
                padding: '16px 48px',
              }}
            >
              파일 선택
            </button>
            <div
              style={{
                marginTop: 24,
                fontSize: 14,
                color: 'var(--text-tertiary)',
              }}
            >
              권장: 1시간 이내의 강의 녹음
            </div>
          </>
        )}

        {uploadingFile && (
          <div>
            <div
              style={{
                fontSize: 48,
                marginBottom: 16,
              }}
            >
              ⏳
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--primary-color)',
              }}
            >
              업로드 중...
            </div>
          </div>
        )}

        {fileUploaded && currentSessionId && (
          <div>
            <div
              style={{
                fontSize: 48,
                marginBottom: 16,
              }}
            >
              ✅
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--success-color, #10b981)',
                marginBottom: 24,
              }}
            >
              업로드 완료!
            </div>
            <button
              onClick={onNavigateToSession}
              style={{
                ...btnPrimary,
                fontSize: 18,
                padding: '16px 48px',
              }}
            >
              텍스트 변환하기 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
