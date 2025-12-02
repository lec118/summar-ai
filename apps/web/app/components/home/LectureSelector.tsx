import React from "react";
import { Lecture } from "@summa/shared";
import { btnPrimary, btnSecondary, selectStyle, sectionStyle, inputStyle } from "../../styles/constants";

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
    <div style={{ ...sectionStyle, padding: 24 }}>
      <h2 style={{ fontSize: 20, marginBottom: 16, fontWeight: 600, color: "var(--text-primary)" }}>
        강의 선택
      </h2>
      
      {!showNewLectureForm ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <select
            onChange={(e) => {
              const lecture = lectures.find((l) => l.id === e.target.value);
              onSelectLecture(lecture || null);
            }}
            value={activeLecture?.id || ""}
            style={selectStyle}
          >
            <option value="">강의를 선택하세요</option>
            {lectures.map((lecture) => (
              <option key={lecture.id} value={lecture.id}>
                {lecture.title}
              </option>
            ))}
          </select>
          <button onClick={onShowNewForm} style={btnSecondary}>
            + 새 강의 만들기
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>새 강의 만들기</h3>
          <input
            type="text"
            value={newLectureTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="강의 제목을 입력하세요"
            style={inputStyle}
            autoFocus
          />
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={onCreateLecture}
              disabled={pending}
              style={{ ...btnPrimary, flex: 1, justifyContent: "center" }}
            >
              {pending ? "생성 중..." : "✓ 생성"}
            </button>
            <button 
              onClick={onHideNewForm} 
              style={{ ...btnSecondary, flex: 1, justifyContent: "center" }}
            >
              취소
            </button>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            예: "2024 AI 기술 세미나", "Python 프로그래밍 강의 1주차"
          </p>
        </div>
      )}

      {activeLecture && !showNewLectureForm && (
        <div style={{ marginTop: 16 }}>
          <span
            style={{
              display: "inline-block",
              padding: "6px 12px",
              background: "rgba(59, 130, 246, 0.15)",
              color: "var(--primary-color)",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              border: "1px solid rgba(59, 130, 246, 0.3)",
            }}
          >
            선택됨: {activeLecture.title}
          </span>
        </div>
      )}
    </div>
  );
}
