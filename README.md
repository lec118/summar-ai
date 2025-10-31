# Summa AI (POC Monorepo)

- **apps/web**: Next.js App — 세션 생성/수동↔자동 모드 전환 UI
- **apps/api**: Fastify API — lectures/sessions/ingest + slides 업로드·정렬·요약 스텁
- **packages/shared**: 공유 타입/DTO
- **packages/audio**: 음성 세그먼트 VAD/Stitch 유틸
- **packages/stt**: Whisper(OpenAI/로컬) 어댑터
- **packages/embeddings**: OpenAI Embedding 호출 래퍼
- **packages/slides**: PDF → 텍스트 파서
- **packages/summarizer**: 증거 기반 요약 LLM 어댑터

## Quickstart
```bash
# 1) toolchain
corepack enable
corepack prepare pnpm@9.11.0 --activate

# 2) install
pnpm i

# 3) 환경 변수 설정
cp .env.example .env  # OPENAI_API_KEY, OPENAI_EMBEDDING_MODEL, SUMM_LLM 등 값 채우기

# 4) runtime
redis-server          # 로컬 Redis 실행
pnpm -w dev           # API + Worker + Web 실행
# → API: http://localhost:4000
# → Web: http://localhost:3000
```

## Evidence → Summary 플로우 (POC)
1. `POST /slides/upload`로 PDF 슬라이드 업로드 (임베딩 생성)
2. 오디오 업로드/TUS → STT → 문단 추출 (worker)
3. `POST /sessions/:sid/align`으로 문단↔슬라이드 정렬 저장
4. `POST /sessions/:sid/summarize` 실행 → 증거 기반 요약 생성
5. `GET /sessions/:sid/summary`로 최신 요약 조회
