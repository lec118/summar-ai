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
        background: completed ? "#1e4d2b" : active ? "#2c3e50" : "#0f1530",
        borderRadius: 12,
        border: `2px solid ${
          completed ? "#27ae60" : active ? "#f39c12" : "#334"
        }`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 8,
          color: completed ? "#27ae60" : active ? "#f39c12" : "#fff",
        }}
      >
        {completed ? "✓" : number}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>
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
        background: "#0f1530",
        borderRadius: 16,
        border: `2px solid ${
          completed ? "#27ae60" : active ? "#f39c12" : "#334"
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
        }}
      >
        {title}
        {completed && (
          <span
            style={{
              padding: "4px 12px",
              background: "#27ae60",
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
              background: "#f39c12",
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
    idle: { label: "대기 중", color: "#95a5a6", bg: "#2c3e50" },
    recording: { label: "녹음 중", color: "#e74c3c", bg: "#3d1f1f" },
    uploaded: { label: "업로드 완료", color: "#3498db", bg: "#1a2a3a" },
    processing: { label: "처리 중", color: "#f39c12", bg: "#3d2f1f" },
    completed: { label: "완료", color: "#27ae60", bg: "#1e4d2b" },
    error: { label: "오류", color: "#e74c3c", bg: "#3d1f1f" },
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
        ? "#e74c3c"
        : "#27ae60"
      : value >= 0.4
      ? "#f39c12"
      : inverted
      ? "#27ae60"
      : "#e74c3c";

  return (
    <div
      style={{
        padding: 16,
        background: "#12183a",
        borderRadius: 8,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
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
            background: "#12183a",
            borderRadius: 8,
            marginBottom: 12,
            borderLeft: "3px solid #5865f2",
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.6,
              marginBottom: 8,
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
          <p style={{ lineHeight: 1.6 }}>{para.text}</p>
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
            background: "#12183a",
            borderRadius: 8,
            marginBottom: 12,
            borderLeft: `3px solid ${
              item.level === "overall" ? "#f39c12" : "#5865f2"
            }`,
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
                  item.level === "overall" ? "#f39c12" : "#5865f2",
                borderRadius: 6,
              }}
            >
              {item.level === "overall" ? "전체" : `세그먼트 ${idx + 1}`}
            </span>
            <span style={{ fontSize: 12, opacity: 0.6 }}>
              점수: {(item.score * 100).toFixed(1)}%
            </span>
          </div>
          <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
            {item.text}
          </p>
          {item.evidence_ids.length > 0 && (
            <div style={{ fontSize: 12, opacity: 0.6 }}>
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
