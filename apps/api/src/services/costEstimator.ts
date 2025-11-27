/**
 * CRITICAL FIX: Cost Estimation & Quota Management
 *
 * Prevents uncontrolled OpenAI API costs by:
 * - Estimating costs before processing
 * - Enforcing usage quotas
 * - Tracking actual usage
 */

import fs from "node:fs/promises";
import { prisma } from "../db.js";
import { randomUUID } from "crypto";

// ============================================================================
// Pricing Constants (Update regularly!)
// ============================================================================
// Source: https://openai.com/pricing (as of January 2025)

export const PRICING = {
  WHISPER_PER_MINUTE: 0.006,  // $0.006/minute
  GPT4_TURBO_INPUT: 0.01,     // $0.01/1K tokens
  GPT4_TURBO_OUTPUT: 0.03,    // $0.03/1K tokens
  EMBEDDING_LARGE: 0.00013    // $0.00013/1K tokens
} as const;

// Estimation constants
const TOKENS_PER_MINUTE = 200;  // Average for transcription
const GPT4_CONTEXT_MULTIPLIER = 3;  // How much context we feed to GPT-4
const GPT4_OUTPUT_RATIO = 0.5;  // Output tokens vs input

// ============================================================================
// Types
// ============================================================================

export interface CostEstimate {
  whisperMinutes: number;
  whisperCost: number;  // in cents
  gpt4TokensEstimate: number;
  gpt4CostEstimate: number;  // in cents
  embeddingTokensEstimate: number;
  embeddingCostEstimate: number;  // in cents
  totalCostEstimate: number;  // in cents
  canAfford: boolean;
  remaining: {
    minutes: number;
    budget: number;  // in cents
  };
}

interface UsageTrackingData {
  sessionId: string;
  lectureId?: string;
  whisperMinutes: number;
  gpt4Tokens?: number;
  embeddingTokens?: number;
}

// ============================================================================
// Cost Estimation
// ============================================================================

/**
 * Estimate transcription cost for a session
 */
export async function estimateTranscriptionCost(
  sessionId: string,
  segments: Array<{ localPath?: string }>
): Promise<CostEstimate> {
  // Calculate total audio duration
  let totalMinutes = 0;
  for (const seg of segments) {
    if (seg.localPath) {
      const duration = await estimateAudioDuration(seg.localPath);
      totalMinutes += duration / 60;
    }
  }

  // Whisper API cost
  const whisperCost = Math.ceil(totalMinutes * PRICING.WHISPER_PER_MINUTE * 100);  // cents

  // Estimate transcript tokens
  const estimatedTokens = Math.ceil(totalMinutes * TOKENS_PER_MINUTE);

  // GPT-4 cost estimate (for summarization)
  const gpt4InputTokens = estimatedTokens * GPT4_CONTEXT_MULTIPLIER;
  const gpt4OutputTokens = Math.ceil(estimatedTokens * GPT4_OUTPUT_RATIO);
  const gpt4TotalTokens = gpt4InputTokens + gpt4OutputTokens;
  const gpt4Cost = Math.ceil(
    (gpt4InputTokens / 1000 * PRICING.GPT4_TURBO_INPUT +
     gpt4OutputTokens / 1000 * PRICING.GPT4_TURBO_OUTPUT) * 100
  );

  // Embedding cost
  const embeddingCost = Math.ceil(estimatedTokens / 1000 * PRICING.EMBEDDING_LARGE * 100);

  // Total cost
  const totalCost = whisperCost + gpt4Cost + embeddingCost;

  // Check quota
  const quota = await getOrCreateDefaultQuota();
  const canAfford = (quota.usedCost + totalCost) <= quota.maxCost &&
                    (quota.usedMinutes + totalMinutes) <= quota.maxMinutes;

  return {
    whisperMinutes: totalMinutes,
    whisperCost,
    gpt4TokensEstimate: gpt4TotalTokens,
    gpt4CostEstimate: gpt4Cost,
    embeddingTokensEstimate: estimatedTokens,
    embeddingCostEstimate: embeddingCost,
    totalCostEstimate: totalCost,
    canAfford,
    remaining: {
      minutes: Math.max(0, quota.maxMinutes - quota.usedMinutes),
      budget: Math.max(0, quota.maxCost - quota.usedCost)
    }
  };
}

/**
 * Estimate audio file duration in seconds
 * Uses file size as rough approximation (1MB ≈ 1 minute for webm audio)
 */
async function estimateAudioDuration(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    const sizeMB = stats.size / (1024 * 1024);

    // Rough estimate: webm audio is ~1MB per minute
    // Could be improved with ffprobe or similar
    return sizeMB * 60;  // seconds
  } catch (error) {
    console.warn(`Failed to estimate duration for ${filePath}:`, error);
    return 60;  // Default to 1 minute if can't read file
  }
}

// ============================================================================
// Quota Management
// ============================================================================

/**
 * Get or create default quota for the system
 * TODO: Make this per-user when authentication is added
 */
export async function getOrCreateDefaultQuota() {
  let quota = await prisma.quotaLimit.findFirst({
    where: { userId: null }  // Global quota for now
  });

  if (!quota) {
    // Create default quota (free tier)
    const now = Date.now();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);  // Reset on 1st of next month
    nextMonth.setHours(0, 0, 0, 0);

    quota = await prisma.quotaLimit.create({
      data: {
        id: randomUUID(),
        userId: null,
        maxMinutes: 180,  // 3 hours per month (free tier)
        maxCost: 500,  // $5.00 per month (in cents)
        usedMinutes: 0,
        usedCost: 0,
        resetDate: BigInt(nextMonth.getTime()),
        createdAt: BigInt(now),
        updatedAt: BigInt(now)
      }
    });

    console.log('✅ Created default quota limit:', {
      maxMinutes: quota.maxMinutes,
      maxCost: `$${quota.maxCost / 100}`,
      resetDate: new Date(Number(quota.resetDate)).toISOString()
    });
  }

  // Check if quota needs to be reset
  const now = Date.now();
  if (now >= Number(quota.resetDate)) {
    // Reset quota for new month
    const nextMonth = new Date(Number(quota.resetDate));
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    quota = await prisma.quotaLimit.update({
      where: { id: quota.id },
      data: {
        usedMinutes: 0,
        usedCost: 0,
        resetDate: BigInt(nextMonth.getTime()),
        updatedAt: BigInt(now)
      }
    });

    console.log('✅ Reset monthly quota:', {
      newResetDate: new Date(Number(quota.resetDate)).toISOString()
    });
  }

  return quota;
}

/**
 * Get current usage statistics
 */
export async function getCurrentUsage() {
  const quota = await getOrCreateDefaultQuota();

  return {
    used: {
      minutes: quota.usedMinutes,
      cost: quota.usedCost,
      costDollars: quota.usedCost / 100
    },
    limit: {
      minutes: quota.maxMinutes,
      cost: quota.maxCost,
      costDollars: quota.maxCost / 100
    },
    remaining: {
      minutes: Math.max(0, quota.maxMinutes - quota.usedMinutes),
      cost: Math.max(0, quota.maxCost - quota.usedCost),
      costDollars: Math.max(0, (quota.maxCost - quota.usedCost) / 100)
    },
    resetDate: new Date(Number(quota.resetDate)),
    percentUsed: {
      minutes: (quota.usedMinutes / quota.maxMinutes) * 100,
      cost: (quota.usedCost / quota.maxCost) * 100
    }
  };
}

// ============================================================================
// Usage Tracking
// ============================================================================

/**
 * Track actual API usage after processing
 */
export async function trackUsage(data: UsageTrackingData): Promise<void> {
  const now = Date.now();

  // Calculate costs
  const whisperCost = Math.ceil(data.whisperMinutes * PRICING.WHISPER_PER_MINUTE * 100);

  let gpt4Cost = 0;
  if (data.gpt4Tokens) {
    const inputTokens = Math.ceil(data.gpt4Tokens * 0.75);  // Estimate 75% input
    const outputTokens = Math.ceil(data.gpt4Tokens * 0.25);  // 25% output
    gpt4Cost = Math.ceil(
      (inputTokens / 1000 * PRICING.GPT4_TURBO_INPUT +
       outputTokens / 1000 * PRICING.GPT4_TURBO_OUTPUT) * 100
    );
  }

  let embeddingCost = 0;
  if (data.embeddingTokens) {
    embeddingCost = Math.ceil(data.embeddingTokens / 1000 * PRICING.EMBEDDING_LARGE * 100);
  }

  const totalCost = whisperCost + gpt4Cost + embeddingCost;

  // Record usage metrics
  await prisma.usageMetrics.create({
    data: {
      id: randomUUID(),
      sessionId: data.sessionId,
      lectureId: data.lectureId,
      whisperMinutes: data.whisperMinutes,
      gpt4Tokens: data.gpt4Tokens || 0,
      embeddingTokens: data.embeddingTokens || 0,
      whisperCost,
      gpt4Cost,
      embeddingCost,
      totalCost,
      createdAt: BigInt(now),
      updatedAt: BigInt(now)
    }
  });

  // Update quota usage
  const quota = await getOrCreateDefaultQuota();
  await prisma.quotaLimit.update({
    where: { id: quota.id },
    data: {
      usedMinutes: { increment: data.whisperMinutes },
      usedCost: { increment: totalCost },
      updatedAt: BigInt(now)
    }
  });

  console.log(`💰 Tracked usage for session ${data.sessionId}:`, {
    minutes: data.whisperMinutes.toFixed(2),
    cost: `$${(totalCost / 100).toFixed(3)}`,
    remaining: `$${((quota.maxCost - quota.usedCost - totalCost) / 100).toFixed(2)}`
  });
}

/**
 * Check if user has enough quota before processing
 */
export async function checkQuota(estimatedCost: number, estimatedMinutes: number): Promise<{
  allowed: boolean;
  reason?: string;
  usage?: ReturnType<typeof getCurrentUsage> extends Promise<infer T> ? T : never;
}> {
  const usage = await getCurrentUsage();

  if (usage.remaining.cost < estimatedCost) {
    return {
      allowed: false,
      reason: `Insufficient budget. Need $${(estimatedCost / 100).toFixed(2)}, have $${usage.remaining.costDollars.toFixed(2)}`,
      usage
    };
  }

  if (usage.remaining.minutes < estimatedMinutes) {
    return {
      allowed: false,
      reason: `Insufficient minutes. Need ${estimatedMinutes.toFixed(1)} min, have ${usage.remaining.minutes.toFixed(1)} min`,
      usage
    };
  }

  return {
    allowed: true,
    usage
  };
}
