"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest, apiUpload } from "../../../lib/api";

type Session = {
  id: string;
  lectureId: string;
  idx: number;
  mode: "manual" | "auto";
  policy: { lengthMin: number; overlapSec: number; vadPause: boolean };
  status: "idle" | "recording" | "uploaded" | "processing" | "completed" | "error";
};

type Segment = {
  id: string;
  sessionId: string;
  localPath?: string;
  createdAt: number;
};

type TranscriptParagraph = {
  id: string;
  text: string;
  startMs?: number;
  endMs?: number;
};

type SummaryItem = {
  id: string;
  level: "segment" | "overall";
  text: string;
  evidence_ids: string[];
  score: number;
  startMs?: number;
  endMs?: number;
};

type SummaryReport = {
  sessionId: string;
  deckId: string;
  items: SummaryItem[];
  metrics: {
    coverage: number;
    avgAlignScore: number;
    evidenceCoverage: number;
    hallucinationRate: number;
  };
  createdAt: number;
};

export default function SessionDetailPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionId } = params;
  const autoStart = searchParams.get("autoStart") === "true";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [transcript, setTranscript] = useState<TranscriptParagraph[]>([]);
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [uploadingSlides, setUploadingSlides] = useState(false);

  // Fetch initial session data
  useEffect(() => {
    async function fetchSessionData() {
      try {
        setLoading(true);
        setError(null);

        // Find session by iterating through lectures
        const lecturesRes = await apiRequest<any[]>("/lectures");
        let foundSession: Session | null = null;

        for (const lecture of lecturesRes) {
          const sessionsRes = await apiRequest<Session[]>(
            `/lectures/${lecture.id}/sessions`
          );
          const session = sessionsRes.find((s) => s.id === sessionId);
          if (session) {
            foundSession = session;
            break;
          }
        }

        if (!foundSession) {
          setError("세션을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        setSession(foundSession);

        // Fetch segments
        try {
          const segmentsRes = await apiRequest<Segment[]>(
            `/sessions/${sessionId}/segments`
          );
          setSegments(segmentsRes);
        } catch (err) {
          console.error("Failed to fetch segments:", err);
        }

        // Fetch transcript if available
        if (
          foundSession.status === "completed" ||
          foundSession.status === "processing"
        ) {
          try {
            const transcriptRes = await apiRequest<{
              paragraphs: TranscriptParagraph[];
            }>(`/sessions/${sessionId}/transcript`);
            setTranscript(transcriptRes.paragraphs || []);
          } catch (err) {
            console.error("Failed to fetch transcript:", err);
          }
        }

        // Fetch summary if available
        try {
          const summaryRes = await apiRequest<SummaryReport>(
            `/sessions/${sessionId}/summary`
          );
          setSummary(summaryRes);
        } catch (err) {
          // Summary might not exist yet
          console.log("No summary available yet");
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching session data:", err);
        setError(
          err instanceof Error ? err.message : "세션 데이터를 불러올 수 없습니다."
        );
        setLoading(false);
      }
    }

    fetchSessionData();
  }, [sessionId]);

  // Poll for status updates when processing
  useEffect(() => {
    if (!session || session.status !== "processing") return;

    const interval = setInterval(async () => {
      try {
        const lecturesRes = await apiRequest<any[]>("/lectures");
        let foundSession: Session | null = null;

        for (const lecture of lecturesRes) {
          const sessionsRes = await apiRequest<Session[]>(
            `/lectures/${lecture.id}/sessions`
          );
          const s = sessionsRes.find((s) => s.id === sessionId);
          if (s) {
            foundSession = s;
            break;
          }
        }

        if (foundSession) {
          setSession(foundSession);

          // Fetch transcript updates
          try {
            const transcriptRes = await apiRequest<{
              paragraphs: TranscriptParagraph[];
            }>(`/sessions/${sessionId}/transcript`);
            setTranscript(transcriptRes.paragraphs || []);
          } catch (err) {
            console.error("Failed to fetch transcript:", err);
          }
        }
      } catch (err) {
        console.error("Error polling session status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [session?.status, sessionId]);

  // Auto-start transcription if requested
  useEffect(() => {
    if (autoStart && session?.status === "uploaded" && !transcribing) {
      startTranscription();
    }
  }, [autoStart, session?.status]);

  async function startTranscription() {
    if (!session) return;

    try {
      setTranscribing(true);
      setError(null);

      await apiRequest(`/sessions/${sessionId}/ingest`, {
        method: "POST",
      });

      // Update session status
      setSession({ ...session, status: "processing" });
    } catch (err) {
      console.error("Failed to start transcription:", err);
      setError(
        err instanceof Error
          ? err.message
          : "텍스트 변환을 시작할 수 없습니다."
      );
    } finally {
      setTranscribing(false);
    }
  }

  async function handleSlidesUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingSlides(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      await apiUpload(`/slides/upload?sessionId=${sessionId}`, formData);

      alert("슬라이드가 성공적으로 업로드되었습니다!");
    } catch (err) {
      console.error("Failed to upload slides:", err);
      setError(
        err instanceof Error ? err.message : "슬라이드 업로드에 실패했습니다."
      );
    } finally {
      setUploadingSlides(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function generateSummary() {
    if (!session) return;

    try {
      setSummarizing(true);
      setError(null);

      const summaryRes = await apiRequest<SummaryReport>(
        `/sessions/${sessionId}/summarize`,
        {
          method: "POST",
        }
      );

      setSummary(summaryRes);
    } catch (err) {
      console.error("Failed to generate summary:", err);
      setError(
        err instanceof Error ? err.message : "요약 생성에 실패했습니다."
      );
    } finally {
      setSummarizing(false);
    }
  }

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

  if (error && !session) {
    return (
      <main style={mainStyle}>
        <div
          style={{
            textAlign: "center",
            padding: 60,
            background: "#0f1530",
            borderRadius: 16,
            maxWidth: 600,
            margin: "60px auto",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h2 style={{ fontSize: 20, marginBottom: 16, color: "#e74c3c" }}>
            오류 발생
          </h2>
          <p style={{ opacity: 0.8, marginBottom: 24 }}>{error}</p>
          <button onClick={() => router.push("/")} style={btnPrimary}>
            ← 홈으로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  const isTranscriptReady =
    session?.status === "completed" || transcript.length > 0;
  const canStartTranscription = session?.status === "uploaded";
  const isTranscribing = session?.status === "processing";

  return (
    <main style={mainStyle}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
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
        <h1 style={{ fontSize: 32, marginBottom: 8, fontWeight: 700 }}>
          🎯 세션 상세
        </h1>
        <p style={{ opacity: 0.7, fontSize: 14 }}>
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
            background: "#3d1f1f",
            border: "1px solid #e74c3c",
            borderRadius: 12,
            marginBottom: 24,
            color: "#ff6b6b",
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* Progress Steps */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 40,
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
          title="슬라이드 업로드"
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
        <p style={{ opacity: 0.8, marginBottom: 16 }}>
          세그먼트 수: <strong>{segments.length}개</strong>
        </p>
        {segments.length > 0 && (
          <div
            style={{
              padding: 12,
              background: "#12183a",
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            ✓ 음성 파일이 성공적으로 업로드되었습니다.
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
            <span>텍스트 변환 시작</span>
          </button>
        )}

        {isTranscribing && (
          <div style={{ padding: 24, textAlign: "center" }}>
            <div
              style={{ fontSize: 48, marginBottom: 16, animation: "pulse 1.5s infinite" }}
            >
              ⏳
            </div>
            <p style={{ fontSize: 18, fontWeight: 600 }}>변환 중...</p>
            <p style={{ opacity: 0.7, fontSize: 14, marginTop: 8 }}>
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
                  background: "#27ae60",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              >
                {transcript.length}개 문단
              </span>
            </h3>
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
          </div>
        )}
      </Section>

      {/* Step 3: Slides Upload */}
      <Section title="📄 Step 3: 슬라이드 업로드 (선택사항)">
        <p style={{ opacity: 0.8, marginBottom: 16 }}>
          강의 슬라이드(PDF)를 업로드하면 더 정확한 요약을 생성할 수 있습니다.
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingSlides}
          style={{
            ...btnPrimary,
            opacity: uploadingSlides ? 0.5 : 1,
            cursor: uploadingSlides ? "not-allowed" : "pointer",
          }}
        >
          {uploadingSlides ? "업로드 중..." : "📤 PDF 업로드"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleSlidesUpload}
          style={{ display: "none" }}
        />
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
            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              {summary.items.map((item, idx) => (
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
          </div>
        )}
      </Section>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </main>
  );
}

// Helper Components
function StepCard({
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

function Section({
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

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    idle: { label: "대기 중", color: "#95a5a6", bg: "#2c3e50" },
    recording: { label: "녹음 중", color: "#e74c3c", bg: "#3d1f1f" },
    uploaded: { label: "업로드 완료", color: "#3498db", bg: "#1a2a3a" },
    processing: { label: "처리 중", color: "#f39c12", bg: "#3d2f1f" },
    completed: { label: "완료", color: "#27ae60", bg: "#1e4d2b" },
    error: { label: "오류", color: "#e74c3c", bg: "#3d1f1f" },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.idle;

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

function MetricCard({
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

// Helper Functions
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// Styles
const mainStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: 24,
  minHeight: "100vh",
};

const btnPrimary: React.CSSProperties = {
  padding: "12px 24px",
  background: "#5865f2",
  color: "#fff",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 600,
  transition: "all 0.2s",
};

const btnSecondary: React.CSSProperties = {
  padding: "10px 20px",
  background: "#0f1530",
  color: "#fff",
  borderRadius: 10,
  border: "1px solid #334",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  transition: "all 0.2s",
};

const btnLarge: React.CSSProperties = {
  padding: "24px 48px",
  background: "#5865f2",
  color: "#fff",
  borderRadius: 16,
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 600,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.3s",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
};

const codeStyle: React.CSSProperties = {
  padding: "2px 8px",
  background: "#12183a",
  borderRadius: 4,
  fontSize: 13,
  fontFamily: "monospace",
};
