import React from "react";
import { Session } from "@summa/shared";
import { btnSm, th, td } from "../../styles/constants";

interface SessionHistoryModalProps {
  show: boolean;
  sessions: Session[];
  onClose: () => void;
  onSessionClick: (sessionId: string) => void;
  onDeleteSession: (session: Session) => void;
}

export function SessionHistoryModal({
  show,
  sessions,
  onClose,
  onSessionClick,
  onDeleteSession,
}: SessionHistoryModalProps) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: 24,
          padding: 32,
          maxWidth: 900,
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          border: "1px solid var(--border-color)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>📋 녹음 기록</h2>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#27272A",
              color: "var(--text-secondary)",
              borderRadius: 12,
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            ✕ 닫기
          </button>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "var(--bg-color)",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid var(--border-color)",
          }}
        >
          <thead>
            <tr style={{ background: "#27272A", borderBottom: "1px solid var(--border-color)" }}>
              <th style={th}>번호</th>
              <th style={th}>생성 일시</th>
              <th style={th}>상태</th>
              <th style={th}>작업</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, idx) => (
              <tr
                key={s.id}
                style={{
                  cursor: "pointer",
                  transition: "background 0.2s",
                  borderBottom: "1px solid var(--border-color)",
                }}
                onClick={() => {
                  onClose();
                  onSessionClick(s.id);
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#27272A")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <td style={td}>{idx + 1}</td>
                <td style={td}>
                  {new Date(s.createdAt ?? Date.now()).toLocaleString("ko-KR")}
                </td>
                <td style={td}>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      background:
                        s.status === "completed"
                          ? "rgba(34, 197, 94, 0.15)"
                          : s.status === "processing"
                          ? "rgba(250, 204, 21, 0.15)"
                          : "rgba(113, 113, 122, 0.15)",
                      color:
                        s.status === "completed"
                          ? "#22C55E"
                          : s.status === "processing"
                          ? "#FACC15"
                          : "var(--text-secondary)",
                      border: `1px solid ${
                        s.status === "completed"
                          ? "rgba(34, 197, 94, 0.3)"
                          : s.status === "processing"
                          ? "rgba(250, 204, 21, 0.3)"
                          : "rgba(113, 113, 122, 0.3)"
                      }`,
                    }}
                  >
                    {s.status === "idle"
                      ? "대기 중"
                      : s.status === "processing"
                      ? "처리 중"
                      : s.status === "completed"
                      ? "완료"
                      : s.status}
                  </span>
                </td>
                <td style={td}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                      onSessionClick(s.id);
                    }}
                    style={{ ...btnSm, background: "var(--primary-color)", boxShadow: "none" }}
                  >
                    열기
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s);
                    }}
                    style={{ ...btnSm, background: "#EF4444", boxShadow: "none" }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    ...td,
                    textAlign: "center",
                    opacity: 0.6,
                    padding: 40,
                    color: "var(--text-secondary)",
                  }}
                >
                  아직 녹음이 없습니다. 녹음을 시작하거나 파일을 업로드하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
