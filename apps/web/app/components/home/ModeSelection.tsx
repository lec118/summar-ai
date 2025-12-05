import React from 'react';

interface ModeSelectionProps {
  onSelectRecording: () => void;
  onSelectUpload: () => void;
}

export function ModeSelection({ onSelectRecording, onSelectUpload }: ModeSelectionProps) {
  return (
    <div className="w-full max-w-4xl mt-12">
      <h2 className="text-2xl font-bold text-white mb-8 text-center">
        녹음 방법을 선택하세요
      </h2>

      <div className="flex flex-wrap gap-6 justify-center">
        {/* 녹음하기 */}
        <button
          onClick={onSelectRecording}
          className="mode-btn glass-panel flex-1 min-w-[280px] p-8 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-5 transition-all hover:-translate-y-1 hover:border-violet-500 hover:shadow-lg group"
        >
          <div className="text-7xl mb-2 group-hover:scale-110 transition-transform">🎤</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-3">녹음하기</div>
            <div className="text-base text-slate-300 leading-relaxed">
              마이크를 사용하여 실시간으로<br/>강의를 녹음합니다
            </div>
          </div>
        </button>

        {/* 파일 업로드 */}
        <button
          onClick={onSelectUpload}
          className="mode-btn glass-panel flex-1 min-w-[280px] p-8 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-5 transition-all hover:-translate-y-1 hover:border-violet-500 hover:shadow-lg group"
        >
          <div className="text-7xl mb-2 group-hover:scale-110 transition-transform">📁</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-3">파일 업로드</div>
            <div className="text-base text-slate-300 leading-relaxed">
              이미 녹음된 음성 파일을<br/>업로드합니다
              <div className="text-sm text-slate-500 mt-1">
                (MP3, M4A, WAV 등)
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-6 p-4 bg-slate-800/50 rounded-lg text-sm text-slate-400 text-center border border-white/5">
        💡 녹음 또는 업로드 후 "텍스트 변환" 버튼을 눌러 진행하세요
      </div>
    </div>
  );
}
