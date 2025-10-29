#!/usr/bin/env bash
set -euo pipefail

ROOT="summa-ai"
if [ ! -d "$ROOT" ]; then
  echo "❌ '$ROOT' 폴더가 없습니다. Step 1~5 먼저 적용하세요."
  exit 1
fi
cd "$ROOT"

echo "📊 1) API: 운영 지표 수집/노출 라우트 추가..."

# 간단 메트릭 수집기 (in-memory)
cat > apps/api/src/ops.metrics.ts <<'TS'
type CounterMap = Record<string, number>;

export const Ops = {
  counters: {
    uploads: 0,
    transcribe_jobs: 0,
    summarize_jobs: 0
  } as CounterMap,
  durations: {
    last_transcribe_ms: 0,
    last_summarize_ms: 0
  } as Record<string, number>,
  quality: {
    last_coverage: 0,
    last_avgAlignScore: 0,
    last_evidenceCoverage: 0,
    last_hallucinationRate: 0
  },
  cost: {
    // 추정치: env로 조정
    stt_min_cost_usd: Number(process.env.COST_STT_PER_MIN ?? 0.006),
    embed_1k_cost_usd: Number(process.env.COST_EMBED_PER_1K ?? 0.00013),
    llm_1k_cost_usd: Number(process.env.COST_LLM_PER_1K ?? 0.003)
  }
};

// 헬퍼
export function inc(key: keyof typeof Ops.counters, n=1) { Ops.counters[key]+=n; }
export function setDur(key: keyof typeof Ops.durations, ms: number) { Ops.durations[key]=ms; }
export function setQuality(q: Partial<typeof Ops.quality>) { Object.assign(Ops.quality, q); }

export function toPrometheus(): string {
  const lines: string[] = [];
  lines.push(`# HELP summa_counter Generic counters`);
  lines.push(`# TYPE summa_counter counter`);
  for (const [k,v] of Object.entries(Ops.counters)) lines.push(`summa_counter{name="${k}"} ${v}`);
  lines.push(`# HELP summa_duration_ms Last op durations`);
  lines.push(`# TYPE summa_duration_ms gauge`);
  for (const [k,v] of Object.entries(Ops.durations)) lines.push(`summa_duration_ms{name="${k}"} ${v}`);
  lines.push(`# HELP summa_quality Quality metrics`);
  lines.push(`# TYPE summa_quality gauge`);
  for (const [k,v] of Object.entries(Ops.quality)) lines.push(`summa_quality{name="${k}"} ${v}`);
  return lines.join("\n")+"\n";
}
TS

# 업로드/워커/요약 경로에 메트릭 호출 연결
# upload.ts: 업로드 완료 시 counter
if ! grep -q "inc(" apps/api/src/upload.ts 2>/dev/null; then
  sed -i.bak '1i import { inc } from "./ops.metrics";' apps/api/src/upload.ts || true
  sed -i.bak 's/app.log.info({ segId: seg.id }, "segment queued for transcription");/inc("uploads",1);\n    app.log.info({ segId: seg.id }, "segment queued for transcription");/' apps/api/src/upload.ts || true
fi

# worker.ts: 잡 수 증가/시간 측정/품질 반영
cat > apps/api/src/worker.ts <<'TS'
import 'dotenv/config';
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import fs from "node:fs";
import { getSTTAdapter } from "@summa/stt";
import { mem } from "./db";
import { addParagraphs } from "./db_transcript";
import { embedTexts } from "@summa/embeddings";
import { inc, setDur } from "./ops.metrics";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

function splitToParas(text: string): { text: string; startMs: number; endMs: number }[] {
  const sentences = text.split(/(?<=[.!?]|[다요]\s)/).map(s => s.trim()).filter(Boolean);
  let t = 0; const dur = 4000;
  return sentences.map(s => { const start=t; const end=t+dur; t=end; return { text:s.slice(0,512), startMs:start, endMs:end }; });
}

async function handleTranscribe(job: Job) {
  const t0 = Date.now();
  const { segmentId, sessionId } = job.data as { segmentId: string; sessionId: string; lectureId: string };
  const seg = (mem.segments.get(sessionId) ?? []).find(s => s.id === segmentId);
  if (!seg?.localPath || !fs.existsSync(seg.localPath)) throw new Error("segment file not found");
  const adapter = getSTTAdapter();
  const result = await adapter.transcribeFile({ filePath: seg.localPath });
  const paras = splitToParas(result.text || "");
  const texts = paras.map(p => p.text);
  const vectors = await embedTexts(texts);
  addParagraphs(sessionId, paras.map((p, i) => ({ sessionId, startMs:p.startMs, endMs:p.endMs, text:p.text, vector:vectors[i].vector, conf:1 })));
  inc("transcribe_jobs",1);
  setDur("last_transcribe_ms", Date.now()-t0);
  return { ok: true, paras: paras.length };
}

new Worker("transcribe", handleTranscribe, { connection });

new Worker("summarize", async job => {
  const t0 = Date.now();
  await new Promise(r => setTimeout(r, 50));
  inc("summarize_jobs",1);
  setDur("last_summarize_ms", Date.now()-t0);
  return { ok: true };
}, { connection });

console.log("👷 Workers running (with ops metrics)...");
TS

# summary.routes.ts: 요약 저장 시 품질 지표 업데이트
if ! grep -q "setQuality" apps/api/src/summary.routes.ts 2>/dev/null; then
  sed -i.bak '1i import { setQuality } from "./ops.metrics";' apps/api/src/summary.routes.ts || true
  sed -i.bak 's/saveSummary(rep);/setQuality({ last_coverage: coverage, last_avgAlignScore: avgAlignScore, last_evidenceCoverage: evidenceCoverage, last_hallucinationRate: hallucinationRate });\n    saveSummary(rep);/' apps/api/src/summary.routes.ts || true
fi

# Ops 라우트
cat > apps/api/src/ops.routes.ts <<'TS'
import type { FastifyInstance } from "fastify";
import { ApiResponse } from "@summa/shared";
import { Ops, toPrometheus } from "./ops.metrics";

export async function registerOpsRoutes(app: FastifyInstance) {
  app.get("/ops/metrics.json", async () => ApiResponse({
    counters: Ops.counters, durations: Ops.durations, quality: Ops.quality, cost: Ops.cost
  }));
  app.get("/ops/prometheus", async (req, reply) => {
    reply.header("Content-Type","text/plain; version=0.0.4");
    return toPrometheus();
  });
}
TS

# server.ts에 Ops 라우트 등록
apply_server_patch() {
cat > apps/api/src/server.ts <<'TS'
import 'dotenv/config';
import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  CreateLectureDTO,
  CreateSessionDTO,
  PatchSessionDTO,
  ApiResponse
} from "@summa/shared";
import { createLecture, createSession, mem, patchSession, getSegments } from "./db";
import { registerTus } from "./upload";
import { registerSlidesRoutes } from "./slides.routes";
import { registerAlignRoutes } from "./align.routes";
import { registerSummaryRoutes } from "./summary.routes";
import { registerOpsRoutes } from "./ops.routes";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/health", async () => ({ ok: true }));

await registerTus(app);
await registerSlidesRoutes(app);
await registerAlignRoutes(app);
await registerSummaryRoutes(app);
await registerOpsRoutes(app);

app.post("/lectures", async (req, reply) => {
  const body = CreateLectureDTO.safeParse(req.body);
  if (!body.success) return reply.code(400).send({ ok: false, error: body.error });
  const lec = createLecture(body.data.title);
  return ApiResponse(lec);
});
app.get("/lectures", async () => ApiResponse(Array.from(mem.lectures.values())));
app.post("/lectures/:id/sessions", async (req, reply) => {
  const id = (req.params as any).id as string;
  if (!mem.lectures.has(id)) return reply.code(404).send({ ok: false, error: "lecture not found" });
  const body = CreateSessionDTO.safeParse(req.body ?? {});
  if (!body.success) return reply.code(400).send({ ok: false, error: body.error });
  const sess = createSession(id, { mode: body.data.mode, policy: body.data.policy as any });
  return ApiResponse(sess);
});
app.get("/lectures/:id/sessions", async (req, reply) => {
  const id = (req.params as any).id as string;
  if (!mem.lectures.has(id)) return reply.code(404).send({ ok: false, error: "lecture not found" });
  return ApiResponse(mem.sessions.get(id) ?? []);
});
app.get("/sessions/:sid/segments", async (req) => {
  const sid = (req.params as any).sid as string;
  return ApiResponse(getSegments(sid));
});
app.patch("/lectures/:id/sessions/:sid", async (req, reply) => {
  const { id, sid } = (req.params as any) as { id: string; sid: string };
  const body = PatchSessionDTO.safeParse(req.body ?? {});
  if (!body.success) return reply.code(400).send({ ok: false, error: body.error });
  const updated = patchSession(id, sid, body.data as any);
  if (!updated) return reply.code(404).send({ ok: false, error: "session not found" });
  return ApiResponse(updated);
});
app.post("/sessions/:sid/ingest", async (req) => {
  for (const [lecId, list] of mem.sessions.entries()) {
    const s = list.find(x => x.id === (req.params as any).sid);
    if (s) { s.status = "processing"; return ApiResponse({ lectureId: lecId, session: s }); }
  }
  return { ok: false, error: "session not found" };
});
app.get("/lectures/:id/status", async (req, reply) => {
  const id = (req.params as any).id as string;
  if (!mem.lectures.has(id)) return reply.code(404).send({ ok: false, error: "lecture not found" });
  const sessions = mem.sessions.get(id) ?? [];
  const counts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  return ApiResponse({ sessions, counts });
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log(`API on http://localhost:${PORT}`);
});
TS
}
apply_server_patch

echo "🖥️ 2) WEB: /dashboard 페이지 추가..."

cat > apps/web/app/dashboard/page.tsx <<'TSX'
"use client";
import { useEffect, useState } from "react";

type Metrics = {
  counters: { uploads:number; transcribe_jobs:number; summarize_jobs:number };
  durations: { last_transcribe_ms:number; last_summarize_ms:number };
  quality: { last_coverage:number; last_avgAlignScore:number; last_evidenceCoverage:number; last_hallucinationRate:number };
  cost: { stt_min_cost_usd:number; embed_1k_cost_usd:number; llm_1k_cost_usd:number };
};
export default function Dashboard(){
  const [m,setM]=useState<Metrics|null>(null);
  const [assume, setAssume] = useState({ minutes: 60, tokensEmbedK: 200, tokensLLMK: 80 });

  useEffect(()=>{
    const tick = () => fetch("http://localhost:4000/ops/metrics.json").then(r=>r.json()).then(x=>setM(x.data));
    tick(); const t=setInterval(tick,1500); return ()=>clearInterval(t);
  },[]);

  const cost = m ? (
    assume.minutes * m.cost.stt_min_cost_usd
    + assume.tokensEmbedK * m.cost.embed_1k_cost_usd
    + assume.tokensLLMK * m.cost.llm_1k_cost_usd
  ) : 0;

  return (
    <main>
      <h1 style={{fontSize:28, marginBottom:8}}>Summa AI — Dashboard</h1>
      <p style={{opacity:.8, marginBottom:20}}>품질/처리량/비용 지표</p>

      <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:16, marginBottom:16}}>
        <Card title="Uploads" value={m?.counters.uploads ?? 0}/>
        <Card title="Transcribe Jobs" value={m?.counters.transcribe_jobs ?? 0}/>
        <Card title="Summarize Jobs" value={m?.counters.summarize_jobs ?? 0}/>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:16, marginBottom:16}}>
        <Card title="Last Transcribe (ms)" value={m?.durations.last_transcribe_ms ?? 0}/>
        <Card title="Last Summarize (ms)" value={m?.durations.last_summarize_ms ?? 0}/>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:16, marginBottom:16}}>
        <Card title="Coverage" value={(m?.quality.last_coverage ?? 0)*100} suffix="%"/>
        <Card title="Avg Align" value={(m?.quality.last_avgAlignScore ?? 0)*100} suffix="%"/>
        <Card title="Evidence Coverage" value={(m?.quality.last_evidenceCoverage ?? 0)*100} suffix="%"/>
        <Card title="Hallucination Rate" value={(m?.quality.last_hallucinationRate ?? 0)*100} suffix="%"/>
      </div>

      <section style={{marginTop:24, padding:16, background:"#12183a", borderRadius:12}}>
        <h2 style={{marginBottom:8}}>비용 추정 (가정값 조정)</h2>
        <div style={{display:"flex", gap:12, marginBottom:8}}>
          <Input label="오디오 분(분)" value={assume.minutes} onChange={v=>setAssume(s=>({...s, minutes:v}))}/>
          <Input label="임베딩 토큰(1k)" value={assume.tokensEmbedK} onChange={v=>setAssume(s=>({...s, tokensEmbedK:v}))}/>
          <Input label="요약 LLM 토큰(1k)" value={assume.tokensLLMK} onChange={v=>setAssume(s=>({...s, tokensLLMK:v}))}/>
        </div>
        <p>추정 비용: <b>${cost.toFixed(4)}</b></p>
      </section>

      <p style={{marginTop:12, opacity:.7}}>Prometheus: <code>GET http://localhost:4000/ops/prometheus</code></p>
    </main>
  );
}

function Card({title,value,suffix}:{title:string;value:number|string;suffix?:string}){
  return (
    <div style={{background:"#12183a", padding:16, borderRadius:12}}>
      <div style={{opacity:.75}}>{title}</div>
      <div style={{fontSize:24, fontWeight:700}}>{value}{suffix ?? ""}</div>
    </div>
  );
}
function Input({label, value, onChange}:{label:string; value:number; onChange:(v:number)=>void}){
  return (
    <label style={{display:"flex", flexDirection:"column", gap:6}}>
      <span style={{opacity:.7}}>{label}</span>
      <input type="number" value={value} onChange={e=>onChange(Number(e.target.value))}
        style={{padding:"8px 10px", borderRadius:8, background:"#0f1530", color:"#fff", border:"1px solid #223"}} />
    </label>
  );
}
TSX

echo "⚙️ 3) CI: GitHub Actions 워크플로 추가..."
mkdir -p .github/workflows
cat > .github/workflows/ci.yml <<'YAML'
name: ci
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Setup PNPM
        uses: pnpm/action-setup@v3
        with:
          version: 9
          run_install: true
      - name: Tests
        run: pnpm -r test
      - name: Build
        run: pnpm -r build
      - name: Typecheck
        run: tsc -v && pnpm -r build
YAML

echo "🧾 4) 배포 템플릿/가이드 추가..."
cat > DEPLOY.md <<'MD'
# Summa AI — Deploy

## Environments
- **Web (apps/web)**: Vercel
- **API/Workers (apps/api)**: Fly.io

## Required Secrets
- **Common**: `REDIS_URL`
- **API**:
  - STT: `STT_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_STT_MODEL`
  - Embeddings: `OPENAI_EMBEDDING_MODEL`
  - Summarizer: `SUMM_LLM`, `SUMM_OPENAI_MODEL` or `SUMM_ANTHROPIC_MODEL`, `ANTHROPIC_API_KEY`
  - RAG: `ALIGN_THRESHOLD`
  - Costs (optional): `COST_STT_PER_MIN`, `COST_EMBED_PER_1K`, `COST_LLM_PER_1K`

## Vercel (Web)
- Project: `apps/web`
- Env Vars: **없음**(API Key는 서버에만)
- Build Command: `pnpm --filter @summa/web build`
- Output: Next.js

## Fly.io (API/Workers)
- Create app & Redis (Upstash or managed)
- Set secrets:
