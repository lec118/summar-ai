import React from "react";
import { Lecture } from "@summa/shared";

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
    <div className="section-card glass-panel max-w-3xl mx-auto w-full">
      <h2 className="text-xl font-semibold mb-4 text-center text-white">
        강의 선택
      </h2>

      {!showNewLectureForm ? (
        <div className="flex flex-wrap gap-3 items-center justify-center">
          <select
            onChange={(e) => {
              const lecture = lectures.find((l) => l.id === e.target.value);
              onSelectLecture(lecture || null);
            }}
            value={activeLecture?.id || ""}
            className="select-field min-w-[300px]"
          >
            <option value="">강의를 선택하세요</option>
            {lectures.map((lecture) => (
              <option key={lecture.id} value={lecture.id}>
                {lecture.title}
              </option>
            ))}
          </select>
          <button onClick={onShowNewForm} className="btn btn-secondary">
            + 새 강의 만들기
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-w-md mx-auto">
          <h3 className="text-base font-semibold text-white">새 강의 만들기</h3>
          <input
            type="text"
            value={newLectureTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="강의 제목을 입력하세요"
            className="input-field"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              onClick={onCreateLecture}
              disabled={pending}
              className="btn btn-primary flex-1 justify-center"
            >
              {pending ? "생성 중..." : "✓ 생성"}
            </button>
            <button 
              onClick={onHideNewForm} 
              className="btn btn-secondary flex-1 justify-center"
            >
              취소
            </button>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            예: "2024 AI 기술 세미나", "Python 프로그래밍 강의 1주차"
          </p>
        </div>
      )}

      {activeLecture && !showNewLectureForm && (
        <div className="mt-4 text-center">
          <span className="inline-block px-3 py-1.5 bg-blue-500/15 text-blue-400 rounded-lg text-sm font-medium border border-blue-500/30">
            선택됨: {activeLecture.title}
          </span>
        </div>
      )}
    </div>
  );
}
