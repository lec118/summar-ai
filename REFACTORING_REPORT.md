# Summa AI - 코드 리뷰 및 리팩토링 보고서

날짜: 2025-10-28
리뷰어: Claude AI Assistant

## 📊 전체 요약

- **분석한 파일**: 10개 이상의 핵심 파일
- **발견된 이슈**: 30개 이상
- **수정한 이슈**: 3개 (CRITICAL 우선순위)
- **남은 작업**: 27개

---

## 🚨 즉시 수정된 CRITICAL 이슈

### 1. ✅ 실제 API 키 노출 (CRITICAL)

**문제:**
- `.env.example` 파일에 실제 OpenAI API 키가 노출되어 있었음
- 버전 관리에 커밋될 경우 보안 침해 발생
- 누구나 해당 키를 사용하여 무단으로 API 호출 가능

**수정 내용:**
- `.env.example`에서 실제 키를 placeholder로 교체
- 상세한 주석 추가
- API 키 취득 방법 링크 추가

**파일:** `/.env.example`

**조치 필요:**
- ⚠️ **즉시 OpenAI API 키를 재발급하세요!** 노출된 키는 더 이상 안전하지 않습니다.

---

### 2. ✅ CORS 보안 취약점 (CRITICAL)

**문제:**
```typescript
// 이전 코드
await app.register(cors, { origin: true }); // 모든 origin 허용!
```

**수정 내용:**
```typescript
// 수정된 코드
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001'
];

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
});
```

**효과:**
- CSRF 공격 방지
- 허용된 도메인만 API 접근 가능
- 프로덕션 환경에서 환경 변수로 설정 가능

**파일:** `/apps/api/src/server.ts`

---

### 3. ✅ 하드코딩된 API 엔드포인트 (MEDIUM)

**문제:**
```typescript
// 이전 코드
const API = (path: string) => `http://localhost:4000${path}`;
```

**수정 내용:**
```typescript
// 수정된 코드
const API = (path: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return `${baseUrl}${path}`;
};
```

**효과:**
- 프로덕션 배포 시 환경 변수로 API URL 설정 가능
- 개발/스테이징/프로덕션 환경 분리 용이

**파일:**
- `/apps/web/app/page.tsx`
- `/apps/web/app/sessions/[sid]/page.tsx`
- `/apps/web/.env.example` (신규 생성)

---

## ⚠️ 남아있는 중요 이슈

### CRITICAL 등급 (즉시 수정 권장)

#### 1. 인증/권한 시스템 없음
**영향도:** ⭐⭐⭐⭐⭐

**문제:**
- 모든 API 엔드포인트가 인증 없이 접근 가능
- 사용자 개념 없음
- 멀티 테넌트 환경에서 데이터 유출 가능

**권장 수정:**
```typescript
// JWT 기반 인증 미들웨어 추가
import jwt from '@fastify/jwt';

await app.register(jwt, {
  secret: process.env.JWT_SECRET
});

app.addHook('onRequest', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});
```

---

#### 2. 데이터 영구 저장소 없음
**영향도:** ⭐⭐⭐⭐⭐

**문제:**
- 모든 데이터가 메모리에만 저장 (Map 사용)
- 서버 재시작 시 모든 데이터 손실
- 수평 확장 불가능

**현재 상태:**
```typescript
// db.ts
export const mem = {
  lectures: new Map<string, Lecture>(),
  sessions: new Map<string, Session[]>(),
  segments: new Map<string, SessionSegment[]>(),
};
```

**권장 수정:**
- PostgreSQL 또는 MongoDB 도입
- Prisma ORM 사용 권장
- 마이그레이션 시스템 구축

---

#### 3. 에러 핸들링 누락
**영향도:** ⭐⭐⭐⭐⭐

**문제 위치:** 8개 이상

**예시 1 - 프론트엔드:**
```typescript
// 문제 코드
useEffect(() => {
  fetch(API("/lectures"))
    .then(r=>r.json())
    .then(x=>setLectures(x.data??[]));
}, []);
```

**권장 수정:**
```typescript
useEffect(() => {
  fetch(API("/lectures"))
    .then(async (r) => {
      if (!r.ok) {
        throw new Error(`HTTP error! status: ${r.status}`);
      }
      return r.json();
    })
    .then(x => setLectures(x.data ?? []))
    .catch(err => {
      console.error('Failed to load lectures:', err);
      // 사용자에게 에러 표시
    });
}, []);
```

**예시 2 - 백엔드:**
```typescript
// Worker에 에러 핸들링 추가 필요
worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
  // 에러 로깅, 알림 발송 등
});
```

---

### HIGH 등급

#### 4. 타입 안전성 부족 (as any 남용)
**영향도:** ⭐⭐⭐⭐

**문제 위치:** 10개 이상

**예시:**
```typescript
// 문제 코드
const id = (req.params as any).id as string;
```

**권장 수정:**
```typescript
// Zod 스키마로 검증
const ParamsSchema = z.object({
  id: z.string().uuid()
});

const { id } = ParamsSchema.parse(req.params);
```

---

#### 5. 입력 검증 없음
**영향도:** ⭐⭐⭐⭐

**문제:**
- 파일 업로드 시 MIME 타입 검증 없음
- 파일 크기 제한만 존재
- 악성 파일 업로드 가능

**권장 수정:**
```typescript
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'audio/mp4'
];

const ALLOWED_DOC_TYPES = [
  'application/pdf'
];

// 파일 타입 검증
if (!ALLOWED_AUDIO_TYPES.includes(data.mimetype)) {
  return reply.code(400).send({
    ok: false,
    error: "Invalid file type. Only audio files are allowed."
  });
}
```

---

#### 6. Rate Limiting 없음
**영향도:** ⭐⭐⭐⭐

**문제:**
- DoS 공격에 취약
- API 남용 방지 불가

**권장 수정:**
```typescript
import rateLimit from '@fastify/rate-limit';

await app.register(rateLimit, {
  max: 100, // 최대 요청 수
  timeWindow: '15 minutes' // 시간 창
});
```

---

### MEDIUM 등급

#### 7. 페이지네이션 없음
**영향도:** ⭐⭐⭐

**문제:**
```typescript
// 모든 데이터 반환
app.get("/lectures", async () =>
  ApiResponse(Array.from(mem.lectures.values()))
);
```

**권장 수정:**
```typescript
app.get("/lectures", async (req) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const lectures = Array.from(mem.lectures.values())
    .slice(skip, skip + limit);

  return ApiResponse({
    data: lectures,
    pagination: {
      page,
      limit,
      total: mem.lectures.size
    }
  });
});
```

---

#### 8. 비효율적인 세션 조회
**영향도:** ⭐⭐⭐

**문제:**
```typescript
// O(n*m) 복잡도
for (const [lecId, list] of mem.sessions.entries()) {
  const s = list.find(x => x.id === sid);
  // ...
}
```

**권장 수정:**
```typescript
// sessionId -> { lectureId, session } 맵 추가
const sessionIndex = new Map<string, { lectureId: string, session: Session }>();
```

---

#### 9. 로깅/모니터링 부재
**영향도:** ⭐⭐⭐

**권장 도입:**
- Pino (구조화된 로깅)
- Sentry (에러 트래킹)
- Prometheus (메트릭)

---

#### 10. 리소스 누수 가능성
**영향도:** ⭐⭐

**문제:**
```typescript
// useEffect dependency 누락
const t = setInterval(f, 1500);
return () => clearInterval(t);
```

**수정:**
```typescript
useEffect(() => {
  const t = setInterval(f, 1500);
  return () => clearInterval(t);
}, [activeLecture]); // dependency 추가
```

---

## 📋 완료되지 않은 기능

### CRITICAL: Summarize Worker 미구현

**현재 상태:**
```typescript
new Worker("summarize", async job => {
  // TODO: Evidence RAG + summarize
  await new Promise(r => setTimeout(r, 100));
  return { ok: true };
}, { connection });
```

**권장 수정:**
실제 요약 로직 구현 필요

---

## 🔧 리팩토링 우선순위

### 즉시 (1-2일)
1. ✅ API 키 교체 및 .env.example 수정
2. ✅ CORS 보안 강화
3. ✅ 환경 변수 설정
4. ⏳ 에러 핸들링 추가
5. ⏳ 입력 검증 강화

### 단기 (1주일)
6. ⏳ 인증/권한 시스템 도입
7. ⏳ 타입 안전성 개선 (as any 제거)
8. ⏳ Rate limiting 추가
9. ⏳ Summarize worker 구현

### 중기 (2-4주)
10. ⏳ 데이터베이스 도입 (PostgreSQL + Prisma)
11. ⏳ 로깅/모니터링 시스템 구축
12. ⏳ 페이지네이션 구현
13. ⏳ 파일 업로드 보안 강화

### 장기 (1-3개월)
14. ⏳ 서비스 레이어 분리
15. ⏳ 테스트 코드 작성
16. ⏳ CI/CD 파이프라인 구축
17. ⏳ 성능 최적화

---

## 📈 개선 효과

### 보안
- ✅ API 키 노출 해결
- ✅ CSRF 공격 방지
- ⏳ 파일 업로드 보안 강화 필요
- ⏳ 인증 시스템 도입 필요

### 안정성
- ⏳ 에러 핸들링 개선 필요
- ⏳ 데이터 영구 저장 필요
- ⏳ 로깅/모니터링 필요

### 유지보수성
- ✅ 환경 변수 분리
- ⏳ 타입 안전성 개선 필요
- ⏳ 아키텍처 개선 필요

### 확장성
- ⏳ 데이터베이스 도입 필요
- ⏳ 페이지네이션 필요
- ⏳ 캐싱 전략 필요

---

## 💡 추천 학습 자료

1. **보안:**
   - OWASP Top 10: https://owasp.org/www-project-top-ten/
   - JWT 인증: https://jwt.io/introduction

2. **TypeScript:**
   - Zod 검증: https://zod.dev/
   - TypeScript Best Practices

3. **아키텍처:**
   - Clean Architecture
   - Repository Pattern

4. **DevOps:**
   - Docker & Kubernetes
   - CI/CD with GitHub Actions

---

## 📞 다음 단계

1. **즉시:** OpenAI API 키 재발급
2. **오늘:** 에러 핸들링 추가 작업 시작
3. **이번 주:** 입력 검증 및 타입 안전성 개선
4. **다음 주:** 인증 시스템 설계 및 구현

---

## 📝 체크리스트

### 보안
- [x] API 키 노출 수정
- [x] CORS 보안 강화
- [ ] 인증/권한 시스템
- [ ] Rate limiting
- [ ] 입력 검증
- [ ] 파일 업로드 보안

### 안정성
- [ ] 에러 핸들링 (프론트엔드)
- [ ] 에러 핸들링 (백엔드)
- [ ] Worker 에러 핸들링
- [ ] 데이터베이스 도입

### 코드 품질
- [ ] as any 제거
- [ ] 타입 안전성 개선
- [ ] 중복 코드 제거
- [ ] 일관된 에러 응답 형식

### 기능 완성도
- [ ] Summarize worker 구현
- [ ] 페이지네이션
- [ ] 로깅 시스템
- [ ] 모니터링 대시보드

---

**작성자:** Claude AI Assistant
**최종 업데이트:** 2025-10-28
