import React from "react";
import { Lecture } from "@summa/shared";
import { btnPrimary, selectStyle } from "../../styles/constants";

interface LectureSelectorProps {
  lectures: Lecture[];
  activeLecture: Lecture | null;
  showNewLectureForm: boolean;
  newLectureTitle: string;
  pending: boolean;
  onSelectLecture: (lecture: Lecture | null) => void;
  onShowNewForm: () => void;
  onHideNewForm: () => void;
  onTitleChange: (title: string) => void;
  onCreateLecture: () => void;
}

export function LectureSelector({
  lectures,
  activeLecture,
  showNewLectureForm,
  newLectureTitle,
  pending,
  onSelectLecture,
  onShowNewForm,
  onHideNewForm,
  onTitleChange,
  onCreateLecture,
}: LectureSelectorProps) {
  return (
    <div
      style={{
        marginBottom: 40,
        padding: 24,
        background: "#0f1530",
        borderRadius: 16,
      }}
    >
      <h2 style={{ fontSize: 20, marginBottom: 16, fontWeight: 600 }}>
        📚 강의 선택
      </h2>

      {!showNewLectureForm ? (
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            disabled={pending}
            onClick={onShowNewForm}
            style={btnPrimary}
          >
            ➕ 새 강의 만들기
          </button>
          <select
            value={activeLecture?.id ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              const lec = lectures.find((l) => l.id === id) ?? null;
              onSelectLecture(lec);
            }}
            style={selectStyle}
          >
            <option value="">기존 강의 선택...</option>
            {lectures.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
          {activeLecture && (
            <span style={{ marginLeft: 16, fontSize: 14, opacity: 0.8 }}>
              선택됨:{" "}
              <b style={{ color: "#5865f2" }}>{activeLecture.title}</b>
            </span>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: 20,
            background: "#192041",
            borderRadius: 12,
            border: "2px solid #5865f2",
          }}
        >
          <h3 style={{ fontSize: 18, marginBottom: 12, fontWeight: 600 }}>
            새 강의 만들기
          </h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              type="text"
              value={newLectureTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCreateLecture()}
              placeholder="강의 제목을 입력하세요..."
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 8,
                background: "#0f1530",
                color: "#fff",
                border: "1px solid #334",
                fontSize: 15,
                outline: "none",
              }}
              autoFocus
            />
            <button
              disabled={pending || !newLectureTitle.trim()}
              onClick={onCreateLecture}
              style={{
                ...btnPrimary,
                opacity: !newLectureTitle.trim() || pending ? 0.5 : 1,
              }}
            >
              ✓ 생성
            </button>
            <button
              onClick={onHideNewForm}
              style={{ ...btnPrimary, background: "#555" }}
            >
              취소
            </button>
          </div>
          <p style={{ fontSize: 13, opacity: 0.6, marginTop: 8 }}>
            예: "2024 AI 기술 세미나", "Python 프로그래밍 강의 1주차"
          </p>
        </div>
      )}
    </div>
  );
}
