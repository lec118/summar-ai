# Summa AI - 사용 가이드

## 시스템 구성

Summa AI는 다음 3개의 서비스로 구성됩니다:

1. **Web (Frontend)** - Next.js 기반 UI (포트 3000)
2. **API (Backend)** - Fastify 기반 REST API (포트 4000)
3. **Worker** - BullMQ 기반 비동기 처리 (Redis 필요)

## 사전 요구사항

- Node.js 20+
- pnpm 9+
- Redis 서버 (로컬 또는 원격)
- OpenAI API 키 (음성 인식 및 임베딩)

## 환경 설정

`.env` 파일을 프로젝트 루트에 생성:

```bash
# Redis
REDIS_URL=redis://127.0.0.1:6379

# OpenAI (필수)
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_STT_MODEL=whisper-1
OPENAI_EMBEDDING_MODEL=text-embedding-3-large

# Speech-to-Text 제공자
STT_PROVIDER=openai

# Summarization (선택)
SUMM_LLM=openai
SUMM_OPENAI_MODEL=gpt-4-turbo
# 또는 Anthropic 사용
# SUMM_LLM=anthropic
# SUMM_ANTHROPIC_MODEL=claude-3-5-sonnet-20240620
# ANTHROPIC_API_KEY=your-anthropic-key
```

## 실행 방법

### 1단계: Redis 서버 시작

**Windows (이미 설치된 경우):**
```bash
redis-server
```

**없다면 Docker 사용:**
```bash
docker run -d -p 6379:6379 redis:alpine
```

### 2단계: API 서버 시작

새 터미널에서:
```bash
cd "C:\Users\Administrator\Desktop\Summa AI\summa-ai"
pnpm --filter @summa/api dev
```

API 서버가 http://localhost:4000 에서 실행됩니다.

### 3단계: Worker 시작

새 터미널에서:
```bash
cd "C:\Users\Administrator\Desktop\Summa AI\summa-ai"
node apps/api/dist/worker.js
```

또는 개발 모드:
```bash
cd "C:\Users\Administrator\Desktop\Summa AI\summa-ai\apps\api"
npx tsx src/worker.ts
```

### 4단계: Web 서버 시작 (이미 실행 중)

웹 서버는 이미 http://localhost:3000 에서 실행 중입니다.

## 사용 흐름

### 📝 1. 강의 생성
1. http://localhost:3000 접속
2. "새 강의 만들기" 버튼 클릭
3. 강의 제목 입력

### 📹 2. 세션 생성
1. 강의 선택
2. "세션 추가(수동)" 또는 "세션 추가(자동분할)" 클릭
3. 생성된 세션의 "상세보기" 클릭

### 🎤 3. 오디오 녹음/업로드
세션 상세 페이지에서:

**방법 A: 파일 업로드**
- "파일 업로드" 버튼 클릭
- 오디오 파일 선택 (mp3, wav, webm 등)

**방법 B: 브라우저 녹음**
- "🎤 녹음 시작" 버튼 클릭
- 마이크 권한 허용
- 녹음 완료 후 "⏹ 녹음 중지" 클릭

### 📝 4. 전사 (Speech-to-Text)
1. 오디오 업로드 후 "전사 시작" 버튼 클릭
2. 백그라운드 워커가 자동으로 처리
3. 약 30초~2분 후 전사 결과가 페이지에 표시됨 (자동 새로고침)

### 📄 5. 슬라이드 업로드 (선택)
1. "PDF 업로드" 버튼 클릭
2. 강의 슬라이드 PDF 선택
3. 시스템이 자동으로 텍스트 추출 및 임베딩 생성

### ✨ 6. 요약 생성
1. 전사 완료 후 "요약 생성" 버튼 클릭
2. AI가 증거 기반 요약 생성
3. 결과에는 다음 메트릭이 포함됨:
   - **Coverage**: 전체 문단 대비 정렬된 문단 비율
   - **Evidence Coverage**: 증거가 있는 요약 항목 비율
   - **Hallucination Rate**: 증거 없는 항목 비율 (낮을수록 좋음)

## API 엔드포인트

### 강의 관리
- `POST /lectures` - 강의 생성
- `GET /lectures` - 강의 목록
- `GET /lectures/:id/sessions` - 세션 목록

### 세션 관리
- `POST /lectures/:id/sessions` - 세션 생성
- `PATCH /lectures/:id/sessions/:sid` - 세션 수정
- `GET /sessions/:sid/segments` - 세그먼트 목록

### 오디오 처리
- `POST /sessions/:sid/upload` - 오디오 파일 업로드
- `POST /sessions/:sid/ingest` - 전사 작업 시작
- `GET /sessions/:sid/transcript` - 전사 결과 조회

### 슬라이드 처리
- `POST /slides/upload` - PDF 업로드 (multipart/form-data)

### 요약
- `POST /sessions/:sid/summarize` - 요약 생성
- `GET /sessions/:sid/summary` - 요약 결과 조회

## 트러블슈팅

### Redis 연결 오류
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
→ Redis 서버가 실행 중인지 확인

### OpenAI API 오류
```
Error: Request failed with status code 401
```
→ `.env` 파일에 올바른 `OPENAI_API_KEY` 설정 확인

### Worker가 작업을 처리하지 않음
→ Worker 프로세스가 실행 중인지 확인
→ Redis 연결 확인

### 파일 업로드 실패
→ `summa-ai/uploads/` 디렉토리가 자동 생성되는지 확인
→ 파일 크기 제한: 500MB

## 주요 기능

✅ **구현 완료:**
- 브라우저 오디오 녹음
- 파일 업로드 (멀티파트)
- OpenAI Whisper 음성 인식
- 전사 결과 실시간 표시
- PDF 슬라이드 업로드
- 증거 기반 요약 생성
- Hallucination 메트릭

🚧 **향후 개발:**
- 실시간 자막 표시
- 오디오 플레이어 통합
- 슬라이드 동기화
- 다중 화자 분리
- 사용자 인증

## 개발 팀

프로젝트: Summa AI - 강의 녹음 자동 전사 및 요약 시스템
