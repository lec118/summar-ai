import React from 'react';

interface ModeSelectionProps {
  onSelectRecording: () => void;
  onSelectUpload: () => void;
}

export function ModeSelection({ onSelectRecording, onSelectUpload }: ModeSelectionProps) {
  const modeButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '48px 32px',
    background: 'var(--bg-secondary)',
    border: '2px solid var(--border-color)',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    minHeight: '280px',
    justifyContent: 'center',
  };

  const iconStyle: React.CSSProperties = {
    fontSize: '72px',
    marginBottom: '8px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '12px',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    textAlign: 'center',
    maxWidth: '300px',
  };

  return (
    <div style={{ width: '100%', maxWidth: '900px', marginTop: '48px' }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: '32px',
        textAlign: 'center',
      }}>
        녹음 방법을 선택하세요
      </h2>

      <div style={{
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap',
      }}>
        {/* 녹음하기 */}
        <button
          onClick={onSelectRecording}
          style={modeButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary-color)';
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={iconStyle}>🎤</div>
          <div>
            <div style={titleStyle}>녹음하기</div>
            <div style={descriptionStyle}>
              마이크를 사용하여 실시간으로 강의를 녹음합니다
            </div>
          </div>
        </button>

        {/* 파일 업로드 */}
        <button
          onClick={onSelectUpload}
          style={modeButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary-color)';
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={iconStyle}>📁</div>
          <div>
            <div style={titleStyle}>파일 업로드</div>
            <div style={descriptionStyle}>
              이미 녹음된 음성 파일을 업로드합니다
              <br />
              <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                (MP3, M4A, WAV 등)
              </span>
            </div>
          </div>
        </button>
      </div>

      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'var(--bg-tertiary)',
        borderRadius: '8px',
        fontSize: '14px',
        color: 'var(--text-secondary)',
        textAlign: 'center',
      }}>
        💡 녹음 또는 업로드 후 "텍스트 변환" 버튼을 눌러 진행하세요
      </div>
    </div>
  );
}
