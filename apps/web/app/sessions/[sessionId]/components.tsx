import React from "react";
import { SessionStatus, TranscriptParagraph, SummaryItem } from "./types";

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
        gap: 12,
        padding: "8px 0",
        opacity: completed ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ opacity: 0.8 }}>{text}</span>
      {completed && <span style={{ marginLeft: "auto", color: "#27ae60" }}>✓</span>}
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
  return (
    <div
      style={{
        padding: 16,
        background: completed ? "rgba(34, 197, 94, 0.1)" : active ? "rgba(250, 204, 21, 0.1)" : "var(--card-bg)",
        borderRadius: 12,
        border: `1px solid ${
          completed ? "#22C55E" : active ? "#FACC15" : "var(--border-color)"
        }`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 8,
          color: completed ? "#22C55E" : active ? "#FACC15" : "var(--text-secondary)",
        }}
      >
        {completed ? "✓" : number}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, wordBreak: "keep-all", overflowWrap: "anywhere", color: "var(--text-primary)" }}>
        {title}
        {optional && (
          <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>
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
      style={{
        marginBottom: 32,
        padding: 24,
        background: "var(--card-bg)",
        borderRadius: 16,
        border: `1px solid ${
          completed ? "#22C55E" : active ? "#FACC15" : "var(--border-color)"
        }`,
      }}
    >
      <h2
        style={{
          fontSize: 20,
          marginBottom: 16,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--text-primary)",
        }}
      >
        {title}
        {completed && (
          <span
            style={{
              padding: "4px 12px",
              background: "rgba(34, 197, 94, 0.2)",
              color: "#22C55E",
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            완료
          </span>
        )}
        {active && (
          <span
            style={{
              padding: "4px 12px",
              background: "rgba(250, 204, 21, 0.2)",
              color: "#FACC15",
              borderRadius: 8,
              fontSize: 14,
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
    { label: string; color: string; bg: string }
  > = {
    idle: { label: "대기 중", color: "var(--text-secondary)", bg: "var(--card-bg)" },
    recording: { label: "녹음 중", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" },
    uploaded: { label: "업로드 완료", color: "var(--primary-color)", bg: "rgba(59, 130, 246, 0.1)" },
    processing: { label: "처리 중", color: "#FACC15", bg: "rgba(250, 204, 21, 0.1)" },
    completed: { label: "완료", color: "#22C55E", bg: "rgba(34, 197, 94, 0.1)" },
    error: { label: "오류", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" },
  };

  const config = statusConfig[status];

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 16px",
        background: config.bg,
        color: config.color,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        border: `1px solid ${config.color}`,
      }}
    >
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
        ? "#EF4444"
        : "#22C55E"
      : value >= 0.4
      ? "#FACC15"
      : inverted
      ? "#22C55E"
      : "#EF4444";

  return (
    <div
      style={{
        padding: 16,
        background: "var(--bg-color)",
        borderRadius: 8,
        textAlign: "center",
        border: "1px solid var(--border-color)",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8, color: "var(--text-secondary)" }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{percentage}%</div>
    </div>
  );
}

export function TranscriptList({ transcript }: { transcript: TranscriptParagraph[] }) {
  return (
    <div style={{ maxHeight: 400, overflowY: "auto" }}>
      {transcript.map((para, idx) => (
        <div
          key={para.id}
          style={{
            padding: 16,
            background: "var(--bg-color)",
            borderRadius: 8,
            marginBottom: 12,
            borderLeft: "3px solid var(--primary-color)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.6,
              marginBottom: 8,
              color: "var(--text-secondary)",
            }}
          >
            문단 {idx + 1}
            {para.startMs !== undefined && (
              <span style={{ marginLeft: 8 }}>
                {formatTime(para.startMs)}
                {para.endMs !== undefined &&
                  ` - ${formatTime(para.endMs)}`}
              </span>
            )}
          </div>
          <p style={{ lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "anywhere", color: "var(--text-primary)" }}>{para.text}</p>
        </div>
      ))}
    </div>
  );
}

export function SummaryItemList({ items }: { items: SummaryItem[] }) {
  return (
    <div style={{ maxHeight: 500, overflowY: "auto" }}>
      {items.map((item, idx) => (
        <div
          key={item.id}
          style={{
            padding: 16,
            background: "var(--bg-color)",
            borderRadius: 8,
            marginBottom: 12,
            borderLeft: `3px solid ${
              item.level === "overall" ? "#FACC15" : "var(--primary-color)"
            }`,
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                background:
                  item.level === "overall" ? "rgba(250, 204, 21, 0.2)" : "rgba(59, 130, 246, 0.2)",
                color: item.level === "overall" ? "#FACC15" : "var(--primary-color)",
                borderRadius: 6,
              }}
            >
              {item.level === "overall" ? "전체" : `세그먼트 ${idx + 1}`}
            </span>
            <span style={{ fontSize: 12, opacity: 0.6, color: "var(--text-secondary)" }}>
              점수: {(item.score * 100).toFixed(1)}%
            </span>
          </div>
          <p style={{ lineHeight: 1.6, marginBottom: 8, wordBreak: "break-word", overflowWrap: "anywhere", color: "var(--text-primary)" }}>
            {item.text}
          </p>
          {item.evidence_ids.length > 0 && (
            <div style={{ fontSize: 12, opacity: 0.6, color: "var(--text-secondary)" }}>
              증거: {item.evidence_ids.length}개
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Helper Functions
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
