# Render 환경 변수 체크리스트

배포하기 전에 Render 대시보드에서 다음 환경 변수들이 모두 설정되어 있는지 확인하세요:

## ✅ 필수 환경 변수

### 데이터베이스
- `DATABASE_URL` - Supabase PostgreSQL 연결 문자열 (이미 설정됨)
  ```
  postgresql://postgres.ypdozdurwgfjymvikttp:tlfqj2011!@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
  ```

### OpenAI API
- `OPENAI_API_KEY` - OpenAI API 키 (필수!)
  - https://platform.openai.com/api-keys 에서 발급
- `OPENAI_STT_MODEL` - `whisper-1` (기본값)
- `OPENAI_EMBEDDING_MODEL` - `text-embedding-3-large` (기본값)

### Redis (필수 - BullMQ 작업 큐용)
- `REDIS_URL` - Redis 연결 URL
  - Render Redis 인스턴스 사용 권장
  - 예: `redis://red-xxxxx:6379` 또는 `rediss://red-xxxxx:6380` (TLS)

### LLM 설정
- `SUMM_LLM` - `openai` (기본값)
- `SUMM_OPENAI_MODEL` - `gpt-4-turbo` (기본값)

### 서버 설정
- `PORT` - `4000` (기본값, Render가 자동 설정)
- `NODE_ENV` - `production`
- `ALLOWED_ORIGINS` - CORS 허용 도메인
  ```
  https://summa-ai-web.vercel.app,https://summa-ai-frontend.vercel.app
  ```

### API URL (선택사항)
- `API_INTERNAL_URL` - 내부 API URL (선택)
- `API_URL` - 외부 API URL (선택)

## 📋 배포 명령어

Render의 Build Command와 Start Command가 올바르게 설정되어 있는지 확인:

### Build Command:
```bash
pnpm install && pnpm build
```

### Start Command:
```bash
pnpm start:prod
```

이 명령은 다음을 실행합니다:
1. `prisma migrate deploy` - 프로덕션 DB 마이그레이션
2. `npm run build` - TypeScript 빌드
3. `npm run start:all` - API 서버와 워커 동시 실행

## ⚠️ 중요 참고사항

1. **Redis는 필수입니다**: BullMQ 작업 큐가 Redis를 사용하므로, Render에서 Redis 인스턴스를 생성하고 `REDIS_URL`을 설정해야 합니다.

2. **OPENAI_API_KEY는 필수입니다**: 이 값이 없으면 서버가 시작되지 않습니다.

3. **DATABASE_URL**: Supabase PostgreSQL URL이 이미 설정되어 있습니다.

4. **ALLOWED_ORIGINS**: Vercel 배포 도메인을 포함해야 합니다.

## 🚀 배포 후 확인사항

배포가 완료되면 다음을 확인:

1. Health check: `https://your-api-url.onrender.com/health`
2. API info: `https://your-api-url.onrender.com/`
3. Lectures 목록: `https://your-api-url.onrender.com/lectures`

## 📝 다음 단계

1. Render 대시보드에서 위 환경 변수들을 모두 설정
2. Redis 인스턴스 생성 (아직 없는 경우)
3. 배포 트리거 (자동 또는 수동)
4. 로그 확인하여 성공적으로 시작되었는지 확인
5. Vercel 프론트엔드에서 API 연결 테스트
