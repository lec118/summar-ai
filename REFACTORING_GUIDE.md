# Summa AI - Critical Refactoring Guide

## Executive Summary

This guide provides step-by-step instructions for implementing critical fixes identified in the code review. The refactoring addresses **CRITICAL** and **HIGH** severity issues that pose risks to data integrity, security, and cost control.

---

## ⚠️ CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION

### 1. **API Cost Control** (NEW - HIGHEST PRIORITY) 🚨💰

**Risk**: Uncontrolled OpenAI API usage could result in **thousands of dollars** in unexpected charges.

**Current State**:
- No usage quotas per user/lecture
- No cost estimation before processing
- No budget limits or alerts
- Free Render deployment but expensive OpenAI API calls

**Estimated Cost Per Lecture** (60 minute recording):
- Whisper API: ~$0.36 (60 min × $0.006/min)
- GPT-4 Turbo (summary): ~$0.50-2.00 depending on length
- Embeddings: ~$0.10-0.50
- **Total per lecture: $1-3**
- **With 100 users × 10 lectures each = $1,000-3,000/month**

**Implementation Required**:

#### Step 1: Add Usage Tracking to Database

```sql
-- Add to schema.prisma
model UsageMetrics {
  id              String   @id @default(uuid())
  userId          String?  // Add user auth later
  lectureId       String?
  sessionId       String?

  // API usage tracking
  whisperMinutes  Float    @default(0)
  gpt4Tokens      Int      @default(0)
  embeddingTokens Int      @default(0)

  // Cost tracking (in USD cents)
  whisperCost     Int      @default(0)
  gpt4Cost        Int      @default(0)
  embeddingCost   Int      @default(0)
  totalCost       Int      @default(0)

  createdAt       BigInt
  updatedAt       BigInt

  @@index([lectureId])
  @@index([sessionId])
  @@index([createdAt])
  @@map("usage_metrics")
}

model QuotaLimit {
  id            String   @id @default(uuid())
  userId        String?  @unique

  // Monthly limits
  maxMinutes    Int      @default(180)  // 3 hours/month for free tier
  maxCost       Int      @default(500)  // $5.00/month

  // Current usage (resets monthly)
  usedMinutes   Float    @default(0)
  usedCost      Int      @default(0)
  resetDate     BigInt

  @@map("quota_limits")
}
```

#### Step 2: Create Cost Estimation Service

```typescript
// apps/api/src/services/costEstimator.ts

export interface CostEstimate {
  whisperMinutes: number;
  whisperCost: number;  // in cents
  gpt4TokensEstimate: number;
  gpt4CostEstimate: number;  // in cents
  embeddingTokensEstimate: number;
  embeddingCostEstimate: number;
  totalCostEstimate: number;  // in cents
  canAfford: boolean;
  remaining: {
    minutes: number;
    budget: number;  // in cents
  };
}

// Pricing constants (as of 2024 - update regularly!)
const PRICING = {
  WHISPER_PER_MINUTE: 0.006,  // $0.006/minute
  GPT4_TURBO_INPUT: 0.01,     // $0.01/1K tokens
  GPT4_TURBO_OUTPUT: 0.03,    // $0.03/1K tokens
  EMBEDDING_LARGE: 0.00013    // $0.00013/1K tokens
} as const;

export async function estimateTranscriptionCost(
  sessionId: string,
  segments: Array<{ localPath: string }>
): Promise<CostEstimate> {
  // Calculate audio duration
  let totalMinutes = 0;
  for (const seg of segments) {
    const duration = await getAudioDuration(seg.localPath);
    totalMinutes += duration / 60;
  }

  const whisperCost = Math.ceil(totalMinutes * PRICING.WHISPER_PER_MINUTE * 100);  // cents

  // Estimate tokens based on typical transcription (1 min ≈ 150 words ≈ 200 tokens)
  const estimatedTokens = totalMinutes * 200;

  // GPT-4 summary typically uses 3x input tokens (context) + 0.5x output
  const gpt4InputTokens = estimatedTokens * 3;
  const gpt4OutputTokens = estimatedTokens * 0.5;
  const gpt4Cost = Math.ceil(
    (gpt4InputTokens / 1000 * PRICING.GPT4_TURBO_INPUT +
     gpt4OutputTokens / 1000 * PRICING.GPT4_TURBO_OUTPUT) * 100
  );

  // Embedding cost (all transcript paragraphs)
  const embeddingCost = Math.ceil(estimatedTokens / 1000 * PRICING.EMBEDDING_LARGE * 100);

  const totalCost = whisperCost + gpt4Cost + embeddingCost;

  // Check user quota
  const quota = await getUserQuota(sessionId);  // Implement this
  const canAfford = (quota.usedCost + totalCost) <= quota.maxCost &&
                    (quota.usedMinutes + totalMinutes) <= quota.maxMinutes;

  return {
    whisperMinutes: totalMinutes,
    whisperCost,
    gpt4TokensEstimate: gpt4InputTokens + gpt4OutputTokens,
    gpt4CostEstimate: gpt4Cost,
    embeddingTokensEstimate: estimatedTokens,
    embeddingCostEstimate: embeddingCost,
    totalCostEstimate: totalCost,
    canAfford,
    remaining: {
      minutes: quota.maxMinutes - quota.usedMinutes,
      budget: quota.maxCost - quota.usedCost
    }
  };
}

// Helper: Get audio duration using ffprobe or similar
async function getAudioDuration(filePath: string): Promise<number> {
  // Implement using ffprobe, or estimate from file size
  // For now, estimate: 1MB ≈ 1 minute for webm audio
  const stats = await fs.stat(filePath);
  const sizeMB = stats.size / (1024 * 1024);
  return sizeMB * 60;  // rough estimate
}
```

#### Step 3: Add Cost Check Before Processing

```typescript
// In server.ts - /sessions/:sid/ingest route

app.post("/sessions/:sid/ingest", async (req, reply) => {
  // ... existing validation ...

  // NEW: Cost estimation and quota check
  const costEstimate = await estimateTranscriptionCost(sid, segments);

  if (!costEstimate.canAfford) {
    return reply.code(402).send({
      ok: false,
      error: "Quota exceeded",
      estimate: {
        cost: costEstimate.totalCostEstimate / 100,  // Convert to dollars
        minutes: costEstimate.whisperMinutes,
        remaining: {
          budget: costEstimate.remaining.budget / 100,
          minutes: costEstimate.remaining.minutes
        }
      },
      message: "You've exceeded your monthly quota. Please upgrade or wait for reset."
    });
  }

  // Log the estimate for transparency
  console.log(`💰 Cost estimate for session ${sid}:`, {
    minutes: costEstimate.whisperMinutes.toFixed(2),
    estimatedCost: `$${(costEstimate.totalCostEstimate / 100).toFixed(2)}`,
    remaining: `$${(costEstimate.remaining.budget / 100).toFixed(2)}`
  });

  // ... rest of existing code ...
});
```

#### Step 4: Track Actual Usage

```typescript
// In worker.ts - after successful transcription

async function handleTranscribe(job: Job) {
  // ... existing transcription code ...

  // NEW: Track actual usage
  await trackUsage({
    sessionId,
    whisperMinutes: audioDurationMinutes,
    whisperCost: Math.ceil(audioDurationMinutes * 0.006 * 100),
    timestamp: Date.now()
  });

  return { ok: true, /* ... */ };
}

async function trackUsage(data: {
  sessionId: string;
  whisperMinutes: number;
  whisperCost: number;
  timestamp: number;
}) {
  await prisma.usageMetrics.create({
    data: {
      id: randomUUID(),
      sessionId: data.sessionId,
      whisperMinutes: data.whisperMinutes,
      whisperCost: data.whisperCost,
      totalCost: data.whisperCost,
      createdAt: BigInt(data.timestamp),
      updatedAt: BigInt(data.timestamp)
    }
  });

  // Update quota
  await prisma.quotaLimit.updateMany({
    where: { /* user filter */ },
    data: {
      usedMinutes: { increment: data.whisperMinutes },
      usedCost: { increment: data.whisperCost }
    }
  });
}
```

#### Step 5: Frontend Warning UI

```typescript
// apps/web/app/sessions/[sessionId]/page.tsx

// Before starting transcription
const estimate = await apiRequest<CostEstimate>(
  `/sessions/${sessionId}/estimate`
);

if (!estimate.canAfford) {
  alert(`⚠️ Quota Exceeded\n\nEstimated cost: $${estimate.totalCostEstimate/100}\nRemaining budget: $${estimate.remaining.budget/100}\n\nPlease upgrade or wait for monthly reset.`);
  return;
}

// Show confirmation dialog
const confirmed = confirm(
  `Start transcription?\n\n` +
  `Duration: ${estimate.whisperMinutes.toFixed(1)} minutes\n` +
  `Estimated cost: $${(estimate.totalCostEstimate/100).toFixed(2)}\n` +
  `Remaining: $${(estimate.remaining.budget/100).toFixed(2)}`
);

if (!confirmed) return;

// Proceed with transcription...
```

---

### 2. **In-Memory State Loss** (DATA INTEGRITY)

**Files**:
- `apps/api/src/db.ts` (processingJobs Map)
- `apps/api/src/db_slides.ts` (decks Map)
- `apps/api/src/db_summary.ts` (store Map)

**Risk**: Server restart = data loss, stuck sessions, orphaned resources

**Solution**: Migrated to Redis + Database

**Implementation**:

1. **Replace db.ts** with refactored version:
   ```bash
   cp apps/api/src/db.refactored.ts apps/api/src/db.ts
   ```

2. **Replace server.ts** with refactored version:
   ```bash
   cp apps/api/src/server.refactored.ts apps/api/src/server.ts
   ```

3. **Test the changes**:
   ```bash
   # Start API server
   pnpm --filter @summa/api dev

   # In another terminal, start worker
   pnpm --filter @summa/api worker

   # Verify Redis connection in logs:
   # Should see: "✅ Redis client initialized for job tracking"
   ```

4. **Verify behavior**:
   - Upload a recording
   - Trigger transcription
   - Check Redis: `redis-cli GET "processing:jobs:<sessionId>"`
   - Restart server
   - Check that job count persists
   - Verify session completes after restarts

---

### 3. **Prisma Client Singleton** (CONNECTION EXHAUSTION)

**Status**: ✅ Fixed in db.refactored.ts

**What Changed**:
```typescript
// Before (WRONG):
const prisma = new PrismaClient();

// After (CORRECT):
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Benefit**: Prevents "Too many clients" errors in development

---

### 4. **Security - No Authentication** (CRITICAL) 🔒

**Current State**: Anyone can access/delete any lecture

**Implementation Required**:

#### Option A: Simple API Key (Quick Fix)

1. Add to `.env`:
   ```env
   API_SECRET_KEY=your-random-secret-key-change-this-in-production
   ```

2. Add middleware in `server.ts`:
   ```typescript
   app.addHook('onRequest', async (request, reply) => {
     // Skip auth for health check
     if (request.url === '/health' || request.url === '/') return;

     const apiKey = request.headers['x-api-key'];
     if (apiKey !== process.env.API_SECRET_KEY) {
       reply.code(401).send({ ok: false, error: 'Unauthorized' });
     }
   });
   ```

3. Update frontend API calls:
   ```typescript
   // apps/web/lib/api.ts
   const response = await fetch(url, {
     ...options,
     headers: {
       ...options.headers,
       'X-API-Key': process.env.NEXT_PUBLIC_API_KEY!
     }
   });
   ```

#### Option B: JWT Authentication (Production Ready)

See `SECURITY_IMPLEMENTATION.md` (to be created)

---

### 5. **CORS Too Permissive** (SECURITY)

**Current Issue**:
```typescript
// Allow all vercel.app domains
if (origin.endsWith('.vercel.app')) {
  cb(null, true);
  return;
}
```

**Fix**:
```typescript
// Whitelist specific deployments
const ALLOWED_VERCEL_APPS = [
  'summa-ai-frontend.vercel.app',
  'summa-ai-frontend-staging.vercel.app'
];

if (origin && ALLOWED_VERCEL_APPS.some(app => origin.endsWith(app))) {
  cb(null, true);
  return;
}
```

---

## 🔄 Implementation Checklist

### Phase 1: Critical Fixes (Do First - Week 1)

- [ ] **1. Add API Cost Controls**
  - [ ] Create database schema for usage tracking
  - [ ] Implement cost estimation service
  - [ ] Add quota checks before processing
  - [ ] Update frontend with cost warnings
  - [ ] Set up usage monitoring dashboard
  - [ ] Configure alerts for high usage

- [ ] **2. Fix In-Memory State**
  - [ ] Deploy db.refactored.ts
  - [ ] Deploy server.refactored.ts
  - [ ] Test Redis job tracking
  - [ ] Verify recovery after restart
  - [ ] Monitor for 48 hours

- [ ] **3. Add Authentication**
  - [ ] Choose auth strategy (API key vs JWT)
  - [ ] Implement auth middleware
  - [ ] Update frontend
  - [ ] Test all endpoints
  - [ ] Document API access

- [ ] **4. Fix CORS**
  - [ ] Whitelist specific domains
  - [ ] Test from allowed origins
  - [ ] Verify blocked origins fail

### Phase 2: High Priority (Week 2-3)

- [ ] **5. Rate Limiting**
  - [ ] Separate limits for upload endpoints
  - [ ] Implement per-user limits (after auth)
  - [ ] Add rate limit headers

- [ ] **6. Input Validation**
  - [ ] Validate all file uploads
  - [ ] Check session exists before upload
  - [ ] Sanitize user inputs
  - [ ] Add magic byte verification

- [ ] **7. Error Recovery**
  - [ ] Add cleanup for failed uploads
  - [ ] Implement session timeout
  - [ ] Add health check for stuck sessions

- [ ] **8. Database Optimization**
  - [ ] Add missing indexes
  - [ ] Implement pagination
  - [ ] Add query result caching

### Phase 3: Production Readiness (Week 4)

- [ ] **9. Monitoring**
  - [ ] Add logging service (winston/pino)
  - [ ] Set up error tracking (Sentry)
  - [ ] Configure usage alerts
  - [ ] Dashboard for costs

- [ ] **10. Documentation**
  - [ ] API documentation (Swagger)
  - [ ] Deployment guide
  - [ ] Security policy
  - [ ] Cost estimation guide for users

- [ ] **11. Testing**
  - [ ] Integration tests
  - [ ] Load testing
  - [ ] Security audit
  - [ ] Cost simulation

---

## 📊 Estimated Impact

### Before Refactoring:
- ❌ **Data Loss Risk**: HIGH (server restart = lost data)
- ❌ **Security Risk**: CRITICAL (no auth, CORS issues)
- ❌ **Cost Risk**: CRITICAL (could rack up $1000s)
- ❌ **Reliability**: MEDIUM (race conditions, stuck sessions)

### After Refactoring:
- ✅ **Data Loss Risk**: LOW (Redis + DB persistence)
- ✅ **Security Risk**: MEDIUM (auth required, still needs user isolation)
- ✅ **Cost Risk**: LOW (quotas + estimates + alerts)
- ✅ **Reliability**: HIGH (atomic operations, recovery mechanisms)

---

## 🚀 Deployment Strategy

### Development:
1. Apply fixes to dev branch
2. Test thoroughly in dev environment
3. Monitor for 1 week

### Staging:
1. Deploy to staging with production-like data
2. Run load tests
3. Verify cost tracking accuracy
4. Test auth flows

### Production:
1. **Backup database** before deployment
2. Deploy during low-traffic window
3. Monitor Redis closely
4. Have rollback plan ready
5. Gradual rollout (10% → 50% → 100%)

---

## 📞 Support

If you encounter issues during implementation:
1. Check logs in Redis: `redis-cli MONITOR`
2. Verify Prisma connection: `npx prisma db pull`
3. Test cost estimation with sample data
4. Review error tracking dashboard

---

## 📝 Next Steps

After completing critical fixes:
1. Review `CODE_REVIEW_REPORT.md` for MEDIUM/LOW priority items
2. Implement monitoring dashboard
3. Set up automated cost reports
4. Plan feature flags for gradual rollout
5. Create user-facing pricing page

---

**Remember**: The #1 priority is **cost control**. Without it, you could wake up to a $10,000 OpenAI bill. Implement usage tracking and quotas BEFORE launching to users.
