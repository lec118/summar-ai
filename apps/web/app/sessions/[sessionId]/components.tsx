import React from "react";
import { SessionStatus, TranscriptParagraph, SummaryItem } from "./types";
import { formatTime } from "../../utils/time";

// Helper Components
export function ProcessStep({
  icon,
  text,
  completed,
}: {
  icon: string;
  text: string;
  completed: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 0",
        opacity: completed ? 0.5 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      <div style={{ 
        fontSize: 24,
        filter: completed ? "grayscale(1)" : "none",
        textShadow: completed ? "none" : "0 0 10px rgba(255,255,255,0.3)"
      }}>{icon}</div>
      <span style={{ 
        fontSize: 16, 
        fontWeight: 500,
        color: "var(--text-primary)" 
      }}>{text}</span>
      {completed && (
        <span style={{ 
          marginLeft: "auto", 
          color: "var(--success-color)",
          textShadow: "0 0 10px rgba(52, 211, 153, 0.4)"
        }}>✓</span>
      )}
    </div>
  );
}

export function StepCard({
  number,
  title,
  completed,
  active,
  optional = false,
}: {
  number: number;
  title: string;
  completed: boolean;
  active: boolean;
  optional?: boolean;
}) {
  const isActive = active && !completed;
  
  return (
    <div
      className="glass-panel"
      style={{
        padding: 24,
        borderRadius: 16,
        textAlign: "center",
        minHeight: 140,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        border: isActive ? "1px solid var(--primary-color)" : undefined,
        boxShadow: isActive ? "0 0 20px var(--primary-glow)" : undefined,
        transform: isActive ? "translateY(-4px)" : "none",
        background: completed ? "rgba(52, 211, 153, 0.05)" : undefined,
      }}
    >
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          marginBottom: 12,
          color: completed ? "var(--success-color)" : isActive ? "var(--primary-color)" : "var(--text-tertiary)",
          textShadow: isActive ? "0 0 15px var(--primary-glow)" : "none",
        }}
      >
        {completed ? "✓" : number}
      </div>
      <div style={{ 
        fontSize: 15, 
        fontWeight: 600, 
        wordBreak: "keep-all", 
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
        lineHeight: 1.5
      }}>
        {title}
        {optional && (
          <span style={{ 
            fontSize: 11, 
            opacity: 0.6, 
            marginLeft: 6,
            display: "block",
            marginTop: 4,
            fontWeight: 400
          }}>
            (선택)
          </span>
        )}
      </div>
    </div>
  );
}

export function Section({
  title,
  children,
  completed = false,
  active = false,
}: {
  title: string;
  children: React.ReactNode;
  completed?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className="glass-panel"
      style={{
        marginBottom: 40,
        padding: 32,
        borderRadius: 24,
        width: "100%",
        border: active ? "1px solid var(--primary-color)" : undefined,
        boxShadow: active ? "0 0 30px rgba(139, 92, 246, 0.15)" : undefined,
      }}
    >
      <h2
        style={{
          fontSize: 24,
          marginBottom: 24,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
        }}
      >
        {title}
        {completed && (
          <span
            style={{
              padding: "4px 12px",
              background: "rgba(52, 211, 153, 0.1)",
              color: "var(--success-color)",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid rgba(52, 211, 153, 0.2)"
            }}
          >
            완료
          </span>
        )}
        {active && (
          <span
            style={{
              padding: "4px 12px",
              background: "rgba(139, 92, 246, 0.1)",
              color: "var(--primary-color)",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid rgba(139, 92, 246, 0.2)",
              boxShadow: "0 0 10px var(--primary-glow)"
            }}
          >
            진행 중
          </span>
        )}
      </h2>
      {children}
    </div>
  );
}

export function StatusBadge({ status }: { status: SessionStatus }) {
  const statusConfig: Record<
    SessionStatus,
    { label: string; color: string; bg: string; border: string }
  > = {
    idle: { 
      label: "대기 중", 
      color: "var(--text-secondary)", 
      bg: "rgba(255, 255, 255, 0.05)",
      border: "rgba(255, 255, 255, 0.1)"
    },
    recording: { 
      label: "녹음 중", 
      color: "var(--danger-color)", 
      bg: "rgba(248, 113, 113, 0.1)",
      border: "rgba(248, 113, 113, 0.2)"
    },
    uploaded: { 
      label: "업로드 완료", 
      color: "var(--primary-color)", 
      bg: "rgba(139, 92, 246, 0.1)",
      border: "rgba(139, 92, 246, 0.2)"
    },
    processing: { 
      label: "처리 중", 
      color: "var(--accent-color)", 
      bg: "rgba(244, 114, 182, 0.1)",
      border: "rgba(244, 114, 182, 0.2)"
    },
    completed: { 
      label: "완료", 
      color: "var(--success-color)", 
      bg: "rgba(52, 211, 153, 0.1)",
      border: "rgba(52, 211, 153, 0.2)"
    },
    error: { 
      label: "오류", 
      color: "var(--danger-color)", 
      bg: "rgba(248, 113, 113, 0.1)",
      border: "rgba(248, 113, 113, 0.2)"
    },
  };

  const config = statusConfig[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 16px",
        background: config.bg,
        color: config.color,
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 600,
        border: `1px solid ${config.border}`,
        boxShadow: status === 'processing' || status === 'recording' ? `0 0 10px ${config.bg}` : "none",
        backdropFilter: "blur(4px)"
      }}
    >
      {status === 'processing' && (
        <span style={{ marginRight: 8, fontSize: 10 }}>●</span>
      )}
      {config.label}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  inverted = false,
}: {
  label: string;
  value: number;
  inverted?: boolean;
}) {
  const percentage = (value * 100).toFixed(1);
  const color =
    value >= 0.7
      ? inverted
        ? "var(--danger-color)"
        : "var(--success-color)"
      : value >= 0.4
      ? "var(--accent-color)"
      : inverted
      ? "var(--success-color)"
      : "var(--danger-color)";

  return (
    <div
      className="glass-panel"
      style={{
        padding: 20,
        borderRadius: 16,
        textAlign: "center",
        transition: "transform 0.2s ease",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ 
        fontSize: 32, 
        fontWeight: 800, 
        color,
        textShadow: `0 0 20px ${color}40`
      }}>{percentage}%</div>
    </div>
  );
}

export function TranscriptList({ transcript }: { transcript: TranscriptParagraph[] }) {
  return (
    <div style={{ maxHeight: 400, overflowY: "auto", paddingRight: 8 }}>
      {transcript.map((para, idx) => (
        <div
          key={para.id}
          style={{
            padding: 20,
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: 12,
            marginBottom: 12,
            borderLeft: "3px solid var(--primary-color)",
            border: "1px solid var(--card-border)",
            transition: "background 0.2s ease"
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.6,
              marginBottom: 8,
              color: "var(--text-secondary)",
              display: "flex",
              justifyContent: "space-between"
            }}
          >
            <span style={{ fontWeight: 600, color: "var(--primary-color)" }}>#{idx + 1}</span>
            {para.startMs !== undefined && (
              <span style={{ fontFamily: "monospace", background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: 4 }}>
                {formatTime(para.startMs)}
                {para.endMs !== undefined &&
                  ` - ${formatTime(para.endMs)}`}
              </span>
            )}
          </div>
          <p style={{ lineHeight: 1.7, wordBreak: "break-word", overflowWrap: "anywhere", color: "var(--text-primary)", fontSize: 15 }}>{para.text}</p>
        </div>
      ))}
    </div>
  );
}

export function SummaryItemList({ items }: { items: SummaryItem[] }) {
  return (
    <div style={{ maxHeight: 500, overflowY: "auto", paddingRight: 8 }}>
      {items.map((item, idx) => (
        <div
          key={item.id}
          style={{
            padding: 20,
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: 12,
            marginBottom: 12,
            borderLeft: `3px solid ${
              item.level === "overall" ? "var(--accent-color)" : "var(--primary-color)"
            }`,
            border: "1px solid var(--card-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 11,
                padding: "4px 10px",
                background:
                  item.level === "overall" ? "rgba(244, 114, 182, 0.1)" : "rgba(139, 92, 246, 0.1)",
                color: item.level === "overall" ? "var(--accent-color)" : "var(--primary-color)",
                borderRadius: 20,
                fontWeight: 600,
                border: `1px solid ${item.level === "overall" ? "rgba(244, 114, 182, 0.2)" : "rgba(139, 92, 246, 0.2)"}`
              }}
            >
              {item.level === "overall" ? "전체 요약" : `세그먼트 ${idx + 1}`}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
              신뢰도: <span style={{ color: "var(--text-primary)" }}>{(item.score * 100).toFixed(1)}%</span>
            </span>
          </div>
          <p style={{ lineHeight: 1.7, marginBottom: 12, wordBreak: "break-word", overflowWrap: "anywhere", color: "var(--text-primary)", fontSize: 15 }}>
            {item.text}
          </p>
          {item.evidence_ids.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ opacity: 0.7 }}>참조된 증거:</span>
              <span style={{ background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 10 }}>{item.evidence_ids.length}개</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
