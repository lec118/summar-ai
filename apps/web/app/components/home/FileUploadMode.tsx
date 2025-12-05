import React from 'react';

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
    <div className="w-full max-w-3xl mx-auto mt-8">
      {/* Back Button */}
      <div className="mb-4">
        <button onClick={onBack} className="btn btn-secondary">
          ← 뒤로 가기
        </button>
      </div>

      {/* Upload Container */}
      <div className="glass-panel rounded-2xl p-12 text-center border border-white/10">
        <div className="text-7xl mb-6">📁</div>

        <h2 className="text-3xl font-bold mb-4 text-white">
          음성 파일 업로드
        </h2>

        <p className="text-slate-300 mb-8 text-base leading-relaxed">
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
              className="btn btn-primary text-lg px-12 py-4"
            >
              파일 선택
            </button>
            <div className="mt-6 text-sm text-slate-500">
              권장: 1시간 이내의 강의 녹음
            </div>
          </>
        )}

        {uploadingFile && (
          <div>
            <div className="text-5xl mb-4 animate-pulse">
              ⏳
            </div>
            <div className="text-lg font-semibold text-violet-400">
              업로드 중...
            </div>
          </div>
        )}

        {fileUploaded && currentSessionId && (
          <div>
            <div className="text-5xl mb-4">
              ✅
            </div>
            <div className="text-xl font-semibold text-emerald-400 mb-6">
              업로드 완료!
            </div>
            <button
              onClick={onNavigateToSession}
              className="btn btn-primary text-lg px-12 py-4"
            >
              텍스트 변환하기 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
