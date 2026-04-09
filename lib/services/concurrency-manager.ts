/**
 * Global Concurrency Manager for Bulk Generation
 * 
 * Manages system-wide limits to prevent overload while ensuring fair
 * resource allocation across all users.
 * 
 * Configuration:
 * - 40 global concurrent articles (all users combined)
 * - 5 concurrent articles per user (fair distribution)
 * - 8 max active bulk jobs (40 ÷ 5 = 8 users running bulk simultaneously)
 * 
 * Math:
 * - 40 concurrent articles × ~1.7 AI calls/article/min = 68 calls/min
 * - OpenAI limit: 10,000 RPM (166/sec) → 68/min is 0.4% utilization ✅ Safe
 * - 8 users × 5 articles each = 40 total ✅ Matches global limit
 */

import { db } from '@/lib/db';
import { bulkJobs, bulkJobArticles } from '@/lib/db/schema';
import { eq, and, inArray, sql, or } from 'drizzle-orm';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface ConcurrencyLimits {
  /** Maximum articles processing across ALL users simultaneously */
  maxConcurrentArticles: number;
  /** Maximum articles per user at any time */
  maxConcurrentPerUser: number;
  /** Maximum bulk jobs running simultaneously */
  maxActiveBulkJobs: number;
}

/**
 * System-wide concurrency limits
 */
export const CONCURRENCY_LIMITS: ConcurrencyLimits = {
  maxConcurrentArticles: 40,        // Global system limit (increased from 30)
  maxConcurrentPerUser: 5,          // Per-user fairness (queue config)
  maxActiveBulkJobs: 8,             // Max 8 users running bulk simultaneously (40÷5=8)
};

// ============================================================================
// TYPES
// ============================================================================

export interface ConcurrencyCheck {
  allowed: boolean;
  reason?: string;
  waitTime?: string;
  systemLoad?: number; // Percentage (0-100)
  queuePosition?: number;
  activeJobs?: number;
  activeArticles?: number;
}

export interface SystemLoadMetrics {
  activeJobs: number;
  activeArticles: number;
  queuedJobs: number;
  loadPercentage: number;
  status: 'available' | 'moderate' | 'high-demand' | 'at-capacity';
}

// ============================================================================
// CONCURRENCY CHECKS
// ============================================================================

/**
 * Check if a new bulk job can start without exceeding system limits
 */
export async function canStartBulkJob(userId: string): Promise<ConcurrencyCheck> {
  try {
    // 1. Check total active bulk jobs
    const [jobCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bulkJobs)
      .where(eq(bulkJobs.status, 'running'));

    const activeBulkJobs = Number(jobCount?.count || 0);

    if (activeBulkJobs >= CONCURRENCY_LIMITS.maxActiveBulkJobs) {
      // Get queue position
      const [queuedCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(bulkJobs)
        .where(eq(bulkJobs.status, 'queued'));

      const queuePosition = Number(queuedCount?.count || 0) + 1;

      return {
        allowed: false,
        reason: 'System at maximum capacity. Your job will be queued.',
        waitTime: estimateWaitTime(queuePosition, 100),
        systemLoad: 100,
        queuePosition,
        activeJobs: activeBulkJobs,
      };
    }

    // 2. Check total active articles being processed
    const [articleCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bulkJobArticles)
      .where(
        and(
          eq(bulkJobArticles.status, 'generating'),
          or(
            eq(bulkJobArticles.phase, 'content'),
            eq(bulkJobArticles.phase, 'images'),
            eq(bulkJobArticles.phase, 'finalizing')
          )
        )
      );

    const activeArticles = Number(articleCount?.count || 0);
    const systemLoad = Math.round((activeArticles / CONCURRENCY_LIMITS.maxConcurrentArticles) * 100);

    // If system is near capacity (>90%), queue new jobs
    if (activeArticles >= CONCURRENCY_LIMITS.maxConcurrentArticles * 0.9) {
      const [queuedCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(bulkJobs)
        .where(eq(bulkJobs.status, 'queued'));

      const queuePosition = Number(queuedCount?.count || 0) + 1;

      return {
        allowed: false,
        reason: 'High system load. Your job will start shortly.',
        waitTime: estimateWaitTime(queuePosition, systemLoad),
        systemLoad,
        queuePosition,
        activeJobs: activeBulkJobs,
        activeArticles,
      };
    }

    // 3. All checks passed
    return {
      allowed: true,
      systemLoad,
      activeJobs: activeBulkJobs,
      activeArticles,
    };
  } catch (error) {
    console.error('[concurrency-manager] Error checking capacity:', error);
    
    // Fail open - allow the job if we can't check
    // This prevents blocking users due to transient DB issues
    return {
      allowed: true,
      systemLoad: 0,
    };
  }
}

/**
 * Get current system load metrics
 */
export async function getSystemLoad(): Promise<SystemLoadMetrics> {
  try {
    // Get job counts by status
    const runningJobs = await db
      .select({ count: sql<number>`count(*)` })
      .from(bulkJobs)
      .where(eq(bulkJobs.status, 'running'));

    const queuedJobs = await db
      .select({ count: sql<number>`count(*)` })
      .from(bulkJobs)
      .where(eq(bulkJobs.status, 'queued'));

    // Get active articles count
    const [articleCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bulkJobArticles)
      .where(
        and(
          eq(bulkJobArticles.status, 'generating'),
          or(
            eq(bulkJobArticles.phase, 'content'),
            eq(bulkJobArticles.phase, 'images'),
            eq(bulkJobArticles.phase, 'finalizing')
          )
        )
      );

    const activeJobs = Number(runningJobs[0]?.count || 0);
    const activeArticles = Number(articleCount?.count || 0);
    const queued = Number(queuedJobs[0]?.count || 0);
    const loadPercentage = Math.min(
      100,
      Math.round((activeArticles / CONCURRENCY_LIMITS.maxConcurrentArticles) * 100)
    );

    // Determine status
    let status: SystemLoadMetrics['status'];
    if (loadPercentage >= 90) {
      status = 'at-capacity';
    } else if (loadPercentage >= 70) {
      status = 'high-demand';
    } else if (loadPercentage >= 40) {
      status = 'moderate';
    } else {
      status = 'available';
    }

    return {
      activeJobs,
      activeArticles,
      queuedJobs: queued,
      loadPercentage,
      status,
    };
  } catch (error) {
    console.error('[concurrency-manager] Error getting system load:', error);
    return {
      activeJobs: 0,
      activeArticles: 0,
      queuedJobs: 0,
      loadPercentage: 0,
      status: 'available',
    };
  }
}

/**
 * Estimate wait time for queued jobs based on current load
 */
export function estimateWaitTime(queuePosition: number, systemLoad: number): string {
  if (queuePosition === 0) return 'Starting now';
  if (queuePosition === 1) return '~5 minutes';
  
  // Average bulk job takes ~20 minutes with 5 concurrent per user
  // If system is at high load, add buffer
  const baseMinutesPerPosition = 8; // ~8 minutes per queue position
  const loadFactor = systemLoad > 80 ? 1.5 : systemLoad > 60 ? 1.2 : 1.0;
  const estimatedMinutes = Math.round(baseMinutesPerPosition * loadFactor * queuePosition);

  if (estimatedMinutes < 5) return '~5 minutes';
  if (estimatedMinutes < 60) return `~${estimatedMinutes} minutes`;
  
  const hours = Math.floor(estimatedMinutes / 60);
  const minutes = estimatedMinutes % 60;
  if (minutes === 0) return `~${hours}h`;
  return `~${hours}h ${minutes}m`;
}

/**
 * Get the number of currently queued jobs for a user
 */
export async function getUserQueuedJobCount(userId: string): Promise<number> {
  try {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bulkJobs)
      .where(
        and(
          eq(bulkJobs.userId, userId),
          eq(bulkJobs.status, 'queued')
        )
      );

    return Number(result?.count || 0);
  } catch (error) {
    console.error('[concurrency-manager] Error getting user queue count:', error);
    return 0;
  }
}

/**
 * Check if system has capacity for more concurrent articles
 * Used by task queue to decide whether to start next batch
 */
export async function hasCapacityForArticles(count: number = 1): Promise<boolean> {
  try {
    const [articleCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bulkJobArticles)
      .where(
        and(
          eq(bulkJobArticles.status, 'generating'),
          or(
            eq(bulkJobArticles.phase, 'content'),
            eq(bulkJobArticles.phase, 'images'),
            eq(bulkJobArticles.phase, 'finalizing')
          )
        )
      );

    const activeArticles = Number(articleCount?.count || 0);
    return (activeArticles + count) <= CONCURRENCY_LIMITS.maxConcurrentArticles;
  } catch (error) {
    console.error('[concurrency-manager] Error checking article capacity:', error);
    return true; // Fail open
  }
}
