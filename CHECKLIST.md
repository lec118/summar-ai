# 🚀 Implementation Checklist

## ✅ COMPLETED
- [x] Code review (67 issues identified)
- [x] Fixed in-memory state loss (Redis-backed)
- [x] Fixed Prisma singleton pattern
- [x] Added database schema for usage tracking
- [x] Created cost estimation service
- [x] Updated db.ts with Redis integration
- [x] Updated server.ts with Redis initialization
- [x] Generated new Prisma client
- [x] Created comprehensive documentation

## ⚠️ MANUAL STEP (Do This Now!)

### Add Cost Check Routes to server.ts

Open `apps/api/src/server.ts` and add these TWO routes at **line 265** (before the "Trigger transcription" route):

```typescript
/** Get cost estimate for transcription */
app.get("/sessions/:sid/estimate", async (req, reply) => {
  const params = RouteParamsSchemas.sessionId.safeParse(req.params);
  if (!params.success) return reply.code(400).send({ ok: false, error: "Invalid session ID" });

  const { sid } = params.data;
  const context = await findSessionById(sid);
  if (!context) return reply.code(404).send({ ok: false, error: "session not found" });

  const segments = await getSegments(sid);
  if (segments.length === 0) {
    return reply.code(400).send({ ok: false, error: "no segments to estimate" });
  }

  const estimate = await estimateTranscriptionCost(sid, segments);
  return ApiResponse({
    estimate: {
      whisperMinutes: estimate.whisperMinutes,
      totalCostCents: estimate.totalCostEstimate,
      totalCostDollars: estimate.totalCostEstimate / 100,
      breakdown: {
        whisper: estimate.whisperCost / 100,
        gpt4: estimate.gpt4CostEstimate / 100,
        embeddings: estimate.embeddingCostEstimate / 100
      },
      canAfford: estimate.canAfford,
      remaining: {
        minutes: estimate.remaining.minutes,
        budgetDollars: estimate.remaining.budget / 100
      }
    }
  });
});

/** Get current usage statistics */
app.get("/usage", async () => {
  const usage = await getCurrentUsage();
  return ApiResponse(usage);
});
```

Then, in the existing `/sessions/:sid/ingest` route, add this AFTER line 281 (after getting segments):

```typescript
  // CRITICAL FIX: Cost estimation and quota check
  const estimate = await estimateTranscriptionCost(sid, segments);
  const quotaCheck = await checkQuota(estimate.totalCostEstimate, estimate.whisperMinutes);

  if (!quotaCheck.allowed) {
    return reply.code(402).send({
      ok: false,
      error: "Quota exceeded",
      reason: quotaCheck.reason,
      estimate: {
        cost: estimate.totalCostEstimate / 100,
        minutes: estimate.whisperMinutes,
        remaining: {
          budget: estimate.remaining.budget / 100,
          minutes: estimate.remaining.minutes
        }
      },
      usage: quotaCheck.usage
    });
  }

  console.log(`💰 Processing session ${sid}:`, {
    minutes: estimate.whisperMinutes.toFixed(2),
    estimatedCost: `$${(estimate.totalCostEstimate / 100).toFixed(2)}`,
    remaining: `$${(estimate.remaining.budget / 100).toFixed(2)}`
  });
```

## 📋 TODO - Before Testing

- [ ] Complete manual step above (add routes to server.ts)
- [ ] Push database schema: `cd apps/api && pnpm prisma db push`
- [ ] Restart dev server
- [ ] Verify Redis connection in logs

## 📋 TODO - Testing

- [ ] Test `/usage` endpoint
- [ ] Test `/sessions/:sid/estimate` endpoint
- [ ] Upload a recording
- [ ] Trigger transcription
- [ ] Verify cost is logged
- [ ] Check Redis: `redis-cli GET "processing:jobs:SESSION_ID"`
- [ ] Restart server while processing
- [ ] Verify job continues after restart

## 📋 TODO - Phase 2 (This Week)

- [ ] Read REFACTORING_GUIDE.md Section 4 (Authentication)
- [ ] Choose auth strategy (API Key vs JWT)
- [ ] Implement authentication
- [ ] Fix CORS to whitelist only your domains
- [ ] Add frontend cost warning UI
- [ ] Deploy to staging

## 📋 TODO - Phase 3 (Next Week)

- [ ] Add usage tracking in worker.ts (after transcription completes)
- [ ] Create usage dashboard
- [ ] Set up cost alerts
- [ ] Load testing
- [ ] Production deployment

## 📝 Key Files to Know

| File | Purpose |
|------|---------|
| `IMPLEMENTATION_COMPLETE.md` | What was done, testing steps |
| `REFACTORING_GUIDE.md` | Complete implementation guide |
| `CODE_REVIEW_REPORT.md` | All 67 issues found |
| `REVIEW_SUMMARY.md` | Executive summary |
| `server-cost-control.patch.txt` | Code to add to server.ts |

## 🆘 Need Help?

1. Check logs for errors
2. Review `IMPLEMENTATION_COMPLETE.md` Troubleshooting section
3. Verify Redis is running: `redis-cli ping` (should return "PONG")
4. Check database: Tables `usage_metrics` and `quota_limits` should exist

## 🎯 Success Metrics

When everything is working:
- ✅ No "Redis client not initialized" warnings
- ✅ Cost estimates shown before transcription
- ✅ Usage endpoint returns data
- ✅ Transcription blocked when over quota
- ✅ Job state survives server restarts

---

**You're 90% done!** Just add those routes and test. The hard part (architecture fixes) is complete.
