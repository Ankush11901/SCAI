/**
 * Access Service
 * 
 * Manages feature access control based on user subscription tier.
 * Controls what features users can access based on their plan.
 */

import { db } from "@/lib/db";
import { subscriptions, creditBalances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isUserUnlimited } from "./quota-service";

// ============================================================================
// Types
// ============================================================================

export type SubscriptionTier = "free" | "pro";

export type ImageProvider = "flux" | "gemini";

export interface FeatureAccess {
  canGenerate: boolean;
  canUseBulkGeneration: boolean;
  availableImageProviders: ImageProvider[];
  maxWordCount: number;
  maxImagesPerArticle: number;
  maxBulkArticles: number;
  canExportWordPress: boolean;
  canBulkExportWordPress: boolean; // Separate control for bulk WP exports
  canUseApiAccess: boolean;
  canUseAdvancedModels: boolean;
  canUsePriorityQueue: boolean;
  dailyArticleLimit: number;
  monthlyArticleLimit: number | null; // null = unlimited for free (just daily), number for pro
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  requiredTier?: SubscriptionTier;
}

// ============================================================================
// Feature Configuration by Tier
// ============================================================================

const TIER_FEATURES: Record<SubscriptionTier, FeatureAccess> = {
  free: {
    canGenerate: true,
    canUseBulkGeneration: false,
    availableImageProviders: ["flux"], // Free users only get basic Flux
    maxWordCount: 1000,
    maxImagesPerArticle: 3,
    maxBulkArticles: 0,
    canExportWordPress: true, // ✓ Single export allowed
    canBulkExportWordPress: false, // ✗ Bulk export blocked
    canUseApiAccess: false,
    canUseAdvancedModels: false,
    canUsePriorityQueue: false,
    dailyArticleLimit: 100, // No daily limit - controlled by monthly credits
    monthlyArticleLimit: 100, // 100 credits/month (~7 articles at ~14 credits each)
  },
  pro: {
    canGenerate: true,
    canUseBulkGeneration: true,
    availableImageProviders: ["flux", "gemini"], // Pro gets all providers
    maxWordCount: 5000,
    maxImagesPerArticle: 10,
    maxBulkArticles: 50, // Max articles per bulk job
    canExportWordPress: true, // ✓ Single export allowed
    canBulkExportWordPress: true, // ✓ Bulk export allowed
    canUseApiAccess: true,
    canUseAdvancedModels: true,
    canUsePriorityQueue: true,
    dailyArticleLimit: 2000, // No daily limit - controlled by monthly credits
    monthlyArticleLimit: 2000, // 2000 credits/month (~125 articles)
  },
};

// ============================================================================
// Core Access Functions
// ============================================================================

/**
 * Get user's current subscription tier
 * Whitelabel users (@whitelabelresell.com) are automatically treated as Pro tier
 * for all feature access, giving them unlimited bulk generation and all premium features.
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  // Check for whitelabel unlimited access first
  const isUnlimited = await isUserUnlimited(userId);
  if (isUnlimited) {
    return "pro"; // Whitelabel users get Pro tier features
  }

  // Regular subscription tier lookup
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (!subscription || subscription.status !== "active") {
    return "free";
  }

  // planType can be 'free', 'pro', 'payg' but we only care about free vs pro
  const planType = subscription.planType;
  return (planType === "pro" ? "pro" : "free") as SubscriptionTier;
}

/**
 * Get full feature access configuration for a user
 */
export async function getUserFeatureFlags(userId: string): Promise<FeatureAccess> {
  const tier = await getUserTier(userId);
  return TIER_FEATURES[tier];
}

/**
 * Get feature access for a specific tier (without user lookup)
 */
export function getTierFeatures(tier: SubscriptionTier): FeatureAccess {
  return TIER_FEATURES[tier];
}

// ============================================================================
// Access Checks
// ============================================================================

/**
 * Check if user can generate articles
 */
export async function checkGenerationAccess(userId: string): Promise<AccessCheckResult> {
  const features = await getUserFeatureFlags(userId);
  
  if (!features.canGenerate) {
    return {
      allowed: false,
      reason: "Article generation is not available for your account.",
      upgradeRequired: true,
      requiredTier: "pro",
    };
  }

  return { allowed: true };
}

/**
 * Check if user can use a specific image provider
 */
export async function canUseImageProvider(
  userId: string,
  provider: ImageProvider
): Promise<AccessCheckResult> {
  const features = await getUserFeatureFlags(userId);

  if (!features.availableImageProviders.includes(provider)) {
    return {
      allowed: false,
      reason: `${provider === "gemini" ? "Gemini" : "Flux"} image generation requires a Pro subscription.`,
      upgradeRequired: true,
      requiredTier: "pro",
    };
  }

  return { allowed: true };
}

/**
 * Check if user can use bulk generation
 */
export async function canUseBulkGeneration(userId: string): Promise<AccessCheckResult> {
  const features = await getUserFeatureFlags(userId);

  if (!features.canUseBulkGeneration) {
    return {
      allowed: false,
      reason: "Bulk generation is only available with a Pro subscription.",
      upgradeRequired: true,
      requiredTier: "pro",
    };
  }

  return { allowed: true };
}

/**
 * Check if requested word count is within limits
 */
export async function checkWordCountLimit(
  userId: string,
  requestedWordCount: number
): Promise<AccessCheckResult> {
  const features = await getUserFeatureFlags(userId);

  if (requestedWordCount > features.maxWordCount) {
    return {
      allowed: false,
      reason: `Word count limit exceeded. Your plan allows up to ${features.maxWordCount} words. Upgrade to Pro for up to ${TIER_FEATURES.pro.maxWordCount} words.`,
      upgradeRequired: true,
      requiredTier: "pro",
    };
  }

  return { allowed: true };
}

/**
 * Check if requested image count is within limits
 */
export async function checkImageCountLimit(
  userId: string,
  requestedImages: number
): Promise<AccessCheckResult> {
  const features = await getUserFeatureFlags(userId);

  if (requestedImages > features.maxImagesPerArticle) {
    return {
      allowed: false,
      reason: `Image limit exceeded. Your plan allows up to ${features.maxImagesPerArticle} images per article. Upgrade to Pro for more images.`,
      upgradeRequired: true,
      requiredTier: "pro",
    };
  }

  return { allowed: true };
}

/**
 * Check if bulk job size is within limits
 */
export async function checkBulkJobSize(
  userId: string,
  articleCount: number
): Promise<AccessCheckResult> {
  const features = await getUserFeatureFlags(userId);

  if (!features.canUseBulkGeneration) {
    return {
      allowed: false,
      reason: "Bulk generation requires a Pro subscription.",
      upgradeRequired: true,
      requiredTier: "pro",
    };
  }

  if (articleCount > features.maxBulkArticles) {
    return {
      allowed: false,
      reason: `Bulk job size exceeded. Maximum ${features.maxBulkArticles} articles per bulk job.`,
      upgradeRequired: false,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can export to WordPress (single article)
 */
export async function canExportWordPress(userId: string): Promise<AccessCheckResult> {
  const features = await getUserFeatureFlags(userId);

  if (!features.canExportWordPress) {
    return {
      allowed: false,
      reason: "WordPress export requires a subscription.",
      upgradeRequired: true,
      requiredTier: "pro",
    };
  }

  return { allowed: true };
}

/**
 * Check if user can bulk export to WordPress (multiple articles)
 */
export async function canBulkExportWordPress(userId: string): Promise<AccessCheckResult> {
  const features = await getUserFeatureFlags(userId);

  if (!features.canBulkExportWordPress) {
    return {
      allowed: false,
      reason: "Bulk WordPress export requires a Pro subscription.",
      upgradeRequired: true,
      requiredTier: "pro",
    };
  }

  return { allowed: true };
}

/**
 * Check if user can use API access
 */
export async function canUseApiAccess(userId: string): Promise<AccessCheckResult> {
  const features = await getUserFeatureFlags(userId);

  if (!features.canUseApiAccess) {
    return {
      allowed: false,
      reason: "API access requires a Pro subscription.",
      upgradeRequired: true,
      requiredTier: "pro",
    };
  }

  return { allowed: true };
}

// ============================================================================
// Maximum Limits
// ============================================================================

/**
 * Get maximum word count for user's tier
 */
export async function getMaxWordCount(userId: string): Promise<number> {
  const features = await getUserFeatureFlags(userId);
  return features.maxWordCount;
}

/**
 * Get maximum images per article for user's tier
 */
export async function getMaxImagesPerArticle(userId: string): Promise<number> {
  const features = await getUserFeatureFlags(userId);
  return features.maxImagesPerArticle;
}

/**
 * Get maximum bulk articles for user's tier
 */
export async function getMaxBulkArticles(userId: string): Promise<number> {
  const features = await getUserFeatureFlags(userId);
  return features.maxBulkArticles;
}

// ============================================================================
// Comprehensive Access Check
// ============================================================================

export interface GenerationRequest {
  wordCount: number;
  imageCount: number;
  imageProvider: ImageProvider;
  isBulk: boolean;
  bulkCount?: number;
  exportToWordPress?: boolean;
}

/**
 * Comprehensive access check for a generation request
 */
export async function validateGenerationRequest(
  userId: string,
  request: GenerationRequest
): Promise<AccessCheckResult> {
  // Check basic generation access
  const generationAccess = await checkGenerationAccess(userId);
  if (!generationAccess.allowed) return generationAccess;

  // Check word count limit
  const wordCountCheck = await checkWordCountLimit(userId, request.wordCount);
  if (!wordCountCheck.allowed) return wordCountCheck;

  // Check image count limit
  const imageCountCheck = await checkImageCountLimit(userId, request.imageCount);
  if (!imageCountCheck.allowed) return imageCountCheck;

  // Check image provider access
  const providerCheck = await canUseImageProvider(userId, request.imageProvider);
  if (!providerCheck.allowed) return providerCheck;

  // Check bulk generation access
  if (request.isBulk) {
    const bulkCheck = await canUseBulkGeneration(userId);
    if (!bulkCheck.allowed) return bulkCheck;

    if (request.bulkCount) {
      const bulkSizeCheck = await checkBulkJobSize(userId, request.bulkCount);
      if (!bulkSizeCheck.allowed) return bulkSizeCheck;
    }
  }

  // Check WordPress export access
  if (request.exportToWordPress) {
    const wpCheck = await canExportWordPress(userId);
    if (!wpCheck.allowed) return wpCheck;
  }

  return { allowed: true };
}

// ============================================================================
// Anonymous User Access
// ============================================================================

/**
 * Get feature access for anonymous users (most restricted)
 */
export function getAnonymousFeatureFlags(): FeatureAccess {
  return {
    canGenerate: true,
    canUseBulkGeneration: false,
    availableImageProviders: ["flux"],
    maxWordCount: 800, // Slightly less than free tier
    maxImagesPerArticle: 2,
    maxBulkArticles: 0,
    canExportWordPress: false,
    canBulkExportWordPress: false,
    canUseApiAccess: false,
    canUseAdvancedModels: false,
    canUsePriorityQueue: false,
    dailyArticleLimit: 1, // Very limited for anonymous
    monthlyArticleLimit: null,
  };
}

/**
 * Validate generation request for anonymous users
 */
export function validateAnonymousGenerationRequest(
  request: GenerationRequest
): AccessCheckResult {
  const features = getAnonymousFeatureFlags();

  if (request.wordCount > features.maxWordCount) {
    return {
      allowed: false,
      reason: `Word count limit exceeded for anonymous users. Sign up for free to generate up to ${TIER_FEATURES.free.maxWordCount} words.`,
      upgradeRequired: true,
    };
  }

  if (request.imageCount > features.maxImagesPerArticle) {
    return {
      allowed: false,
      reason: `Image limit exceeded for anonymous users. Sign up for more images.`,
      upgradeRequired: true,
    };
  }

  if (!features.availableImageProviders.includes(request.imageProvider)) {
    return {
      allowed: false,
      reason: `${request.imageProvider} is not available for anonymous users. Sign up to access all features.`,
      upgradeRequired: true,
    };
  }

  if (request.isBulk) {
    return {
      allowed: false,
      reason: "Bulk generation requires an account. Sign up for free!",
      upgradeRequired: true,
    };
  }

  if (request.exportToWordPress) {
    return {
      allowed: false,
      reason: "WordPress export requires a Pro subscription.",
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}
