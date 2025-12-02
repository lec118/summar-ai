"use client";
import { useRef, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useSessionData,
  useSessionPolling,
  useTranscription,
  useSlidesUpload,
  useSummaryGeneration,
} from "./hooks";
import {
  ProcessStep,
  StepCard,
  Section,
  StatusBadge,
  MetricCard,
  TranscriptList,
  SummaryItemList,
} from "./components";
import { mainStyle, btnPrimary, btnSecondary, btnLarge, codeStyle } from "./styles";
import { ErrorModal } from "../../components/ErrorModal";

export default function SessionDetailPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionId } = params;
  const autoStart = searchParams.get("autoStart") === "true";

  // Error modal state
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string; title?: string }>({
    isOpen: false,
    message: "",
    title: "오류",
  });

  // Custom hooks for data and actions
  const { session, setSession, segments, transcript, setTranscript, summary, setSummary, loading, error, setError } = useSessionData(sessionId);
  useSessionPolling(sessionId, session, setSession, setTranscript);
  const { transcribing, transcriptionStep, successMessage, startTranscription } = useTranscription(sessionId, session, setSession, setError);
  const { uploadingSlides, uploadSlides } = useSlidesUpload(
    sessionId,
    setError,
    (message) => {
      setErrorModal({ isOpen: true, message, title: "성공" });
    }
  );
  const { summarizing, generateSummary } = useSummaryGeneration(
    sessionId,
    setSummary,
    setError,
    (message) => {
      setErrorModal({ isOpen: true, message, title: "오류" });
    }
  );

  // File input ref for slides upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-start transcription if requested
  useEffect(() => {
    if (autoStart && session?.status === "uploaded" && !transcribing) {
      startTranscription();
    }
  }, [autoStart, session?.status]);

  // Computed values
  const isTranscriptReady = session?.status === "completed" || transcript.length > 0;
  const canStartTranscription = session?.status === "uploaded";
  const isTranscribing = session?.status === "processing";

  // Loading state
  if (loading) {
    return (
      <main style={mainStyle}>
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h2 style={{ fontSize: 20, opacity: 0.8 }}>
            세션 데이터를 불러오는 중...
          </h2>
        </div>
      </main>
    );
  }

  // Error state
  if (error && !session) {
    return (
      <main style={mainStyle}>
        <div
          style={{
            textAlign: "center",
            padding: 60,
            background: "var(--card-bg)",
            borderRadius: 24,
            maxWidth: 600,
            margin: "60px auto",
            boxShadow: "var(--shadow-md)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h2 style={{ fontSize: 20, marginBottom: 16, color: "var(--danger-color)", fontWeight: 700 }}>
            오류 발생
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>{error}</p>
          <button onClick={() => router.push("/")} style={btnPrimary}>
            ← 홈으로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ ...mainStyle, alignItems: "flex-start", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 32, width: "100%" }}>
        <button
          onClick={() => router.push("/")}
          style={{
            ...btnSecondary,
            marginBottom: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ← 홈으로 돌아가기
        </button>
        <h1 style={{ fontSize: 32, marginBottom: 8, fontWeight: 700, color: "var(--text-primary)" }}>
          🎯 세션 상세
        </h1>
        <p style={{ opacity: 0.7, fontSize: 14, color: "var(--text-secondary)" }}>
          세션 ID: <code style={codeStyle}>{sessionId}</code>
        </p>
        <div style={{ marginTop: 8 }}>
          <StatusBadge status={session?.status || "idle"} />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: 16,
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: 12,
            marginBottom: 24,
            color: "var(--danger-color)",
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* Success Message Toast */}
      {successMessage && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            padding: 20,
            background: "var(--card-bg)",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            zIndex: 9999,
            maxWidth: 400,
            animation: "slideIn 0.3s ease-out",
            border: "1px solid var(--primary-color)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ fontSize: 32, flexShrink: 0 }}>✅</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
                변환 시작됨
              </div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {successMessage}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 40,
          width: "100%",
        }}
      >
        <StepCard
          number={1}
          title="음성 업로드"
          completed={
            session?.status !== "idle" && session?.status !== "recording"
          }
          active={false}
        />
        <StepCard
          number={2}
          title="텍스트 변환"
          completed={isTranscriptReady}
          active={isTranscribing}
        />
        <StepCard
          number={3}
          title="교육자료 업로드"
          completed={false}
          active={false}
          optional
        />
        <StepCard
          number={4}
          title="요약 생성"
          completed={!!summary}
          active={summarizing}
        />
      </div>

      {/* Step 1: Upload Status */}
      <Section
        title="📤 Step 1: 음성 업로드"
        completed={
          session?.status !== "idle" && session?.status !== "recording"
        }
      >
        <p style={{ opacity: 0.8, marginBottom: 16, color: "var(--text-secondary)" }}>
          세그먼트 수: <strong style={{ color: "var(--text-primary)" }}>{segments.length}개</strong>
        </p>

        {session?.status === "idle" && segments.length === 0 && (
          <div
            style={{
              padding: 20,
              background: "var(--bg-color)",
              borderRadius: 16,
              fontSize: 15,
              color: "var(--text-secondary)",
              border: "1px solid var(--border-color)",
            }}
          >
            💡 홈 페이지로 돌아가서 녹음을 시작하세요.
          </div>
        )}

        {session?.status === "uploaded" && segments.length > 0 && (
          <div
            style={{
              padding: 16,
              background: "rgba(59, 130, 246, 0.1)",
              borderRadius: 16,
              fontSize: 15,
              color: "var(--primary-color)",
              fontWeight: 600,
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            ✓ 음성 파일이 성공적으로 업로드되었습니다.
          </div>
        )}

        {session?.status === "processing" && (
          <div
            style={{
              padding: 20,
              background: "rgba(250, 204, 21, 0.1)",
              borderRadius: 16,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#FACC15",
              border: "1px solid rgba(250, 204, 21, 0.2)",
            }}
          >
            <div style={{ animation: "pulse 1.5s infinite" }}>⏳</div>
            <div>텍스트 변환 작업이 진행 중입니다...</div>
          </div>
        )}

        {session?.status === "completed" && (
          <div
            style={{
              padding: 16,
              background: "rgba(34, 197, 94, 0.1)",
              borderRadius: 16,
              fontSize: 15,
              color: "#22C55E",
              fontWeight: 600,
              border: "1px solid rgba(34, 197, 94, 0.2)",
            }}
          >
            ✓ 텍스트 변환이 완료되었습니다!
          </div>
        )}
      </Section>

      {/* Step 2: Transcription */}
      <Section
        title="🎤 Step 2: 텍스트 변환"
        completed={isTranscriptReady}
        active={isTranscribing}
      >
        {canStartTranscription && !isTranscribing && (
          <>
            <button
              onClick={startTranscription}
              disabled={transcribing}
              style={{
                ...btnLarge,
                opacity: transcribing ? 0.5 : 1,
                cursor: transcribing ? "not-allowed" : "pointer",
              }}
            >
              <span style={{ fontSize: 32, marginBottom: 8 }}>🚀</span>
              <span>{transcribing ? "처리 중..." : "텍스트 변환 시작"}</span>
            </button>

            {/* Real-time process feedback */}
            {transcriptionStep && (
              <div style={{
                marginTop: 24,
                padding: 20,
                background: "rgba(239, 68, 68, 0.1)",
                borderRadius: 16,
                border: "1px solid rgba(239, 68, 68, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: 16
              }}>
                <div style={{ fontSize: 24, animation: "pulse 1.5s infinite" }}>⚙️</div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--danger-color)", marginBottom: 4 }}>진행 중</div>
                  <div style={{ fontSize: 15, color: "var(--text-secondary)" }}>{transcriptionStep}</div>
                </div>
              </div>
            )}
          </>
        )}

        {!canStartTranscription && !isTranscribing && !isTranscriptReady && (
          <div style={{ padding: 20, background: "var(--bg-color)", borderRadius: 16, border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
            ⚠️ 현재 상태: <strong style={{ color: "var(--text-primary)" }}>{session?.status}</strong><br/>
            텍스트 변환을 시작하려면 먼저 음성 파일을 업로드해야 합니다.
          </div>
        )}

        {isTranscribing && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div
              style={{ fontSize: 48, marginBottom: 16, animation: "pulse 1.5s infinite" }}
            >
              ⏳
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: "var(--text-primary)" }}>변환 중...</p>

            {/* Progress Bar */}
            <div style={{ maxWidth: 600, margin: "0 auto 24px" }}>
              <div
                style={{
                  width: "100%",
                  height: 12,
                  background: "var(--bg-secondary)",
                  borderRadius: 6,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "var(--primary-color)",
                    borderRadius: 6,
                    animation: "progressAnimation 2s ease-in-out infinite",
                    width: "100%",
                  }}
                />
              </div>

              {/* Process Steps */}
              <div style={{ marginTop: 16, fontSize: 14, color: "var(--text-secondary)" }}>
                <ProcessStep
                  icon="🎵"
                  text="오디오 파일 분석 중..."
                  completed={false}
                />
                <ProcessStep
                  icon="🗣️"
                  text="음성을 텍스트로 변환 중..."
                  completed={false}
                />
                <ProcessStep
                  icon="📝"
                  text="문단 구조화 및 최적화 중..."
                  completed={false}
                />
              </div>
            </div>

            <p style={{ opacity: 0.7, fontSize: 14, marginTop: 8, color: "var(--text-secondary)" }}>
              음성을 텍스트로 변환하고 있습니다. 잠시만 기다려주세요.
            </p>
          </div>
        )}

        {isTranscriptReady && transcript.length > 0 && (
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ✓ 변환 완료
              <span
                style={{
                  padding: "4px 12px",
                  background: "var(--success-color)",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              >
                {transcript.length}개 문단
              </span>
            </h3>
            <TranscriptList transcript={transcript} />
          </div>
        )}
      </Section>

      {/* Step 3: Slides Upload (Optional) */}
      <Section
        title="📚 Step 3: 교육자료 업로드 (선택사항)"
        completed={false}
        active={false}
      >
        <p style={{ opacity: 0.8, marginBottom: 16 }}>
          PDF, PowerPoint 등의 교육 자료를 업로드하면 더 정확한 요약을 생성할 수 있습니다.
        </p>

        {isTranscriptReady && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf,.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadSlides(file);
              }}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingSlides}
              style={{
                ...btnLarge,
                opacity: uploadingSlides ? 0.5 : 1,
                cursor: uploadingSlides ? "not-allowed" : "pointer",
              }}
            >
              <span style={{ fontSize: 32, marginBottom: 8 }}>📤</span>
              <span>{uploadingSlides ? "업로드 중..." : "교육 자료 업로드"}</span>
            </button>
          </>
        )}

        {!isTranscriptReady && (
          <p style={{ opacity: 0.6, fontSize: 14 }}>
            ⚠️ 텍스트 변환을 먼저 완료해주세요.
          </p>
        )}
      </Section>

      {/* Step 4: Summary Generation */}
      <Section
        title="📝 Step 4: 요약 생성"
        completed={!!summary}
        active={summarizing}
      >
        {!summary && isTranscriptReady && (
          <button
            onClick={generateSummary}
            disabled={summarizing || !isTranscriptReady}
            style={{
              ...btnLarge,
              opacity: summarizing || !isTranscriptReady ? 0.5 : 1,
              cursor:
                summarizing || !isTranscriptReady ? "not-allowed" : "pointer",
            }}
          >
            <span style={{ fontSize: 32, marginBottom: 8 }}>✨</span>
            <span>{summarizing ? "생성 중..." : "AI 요약 생성"}</span>
          </button>
        )}

        {!isTranscriptReady && (
          <p style={{ opacity: 0.6, fontSize: 14 }}>
            ⚠️ 텍스트 변환을 먼저 완료해주세요.
          </p>
        )}

        {summary && (
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ✓ 요약 완료
            </h3>

            {/* Metrics */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <MetricCard
                label="커버리지"
                value={summary.metrics.coverage}
              />
              <MetricCard
                label="정렬 점수"
                value={summary.metrics.avgAlignScore}
              />
              <MetricCard
                label="증거 커버리지"
                value={summary.metrics.evidenceCoverage}
              />
              <MetricCard
                label="환각 비율"
                value={summary.metrics.hallucinationRate}
                inverted
              />
            </div>

            {/* Summary Items */}
            <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              요약 내용:
            </h4>
            <SummaryItemList items={summary.items} />
          </div>
        )}
      </Section>

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: "", title: "오류" })}
      />
    </main>
  );
}
