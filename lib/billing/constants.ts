/**
 * Billing constants for SCAI Article Generator
 *
 * Credit System:
 * - 1 credit ≈ $0.05 of AI compute cost
 * - $99/mo plan = 2,000 credits/month ≈ 125 articles of 1,000 words each
 * - Text: 5 credits per 1,000 words (with complexity multipliers)
 * - Flux images: 2 credits each
 * - Gemini images: 13 credits each
 *
 * Example: A 1,000-word article with 4 Flux images = ~14 credits
 * Example: A 1,000-word article with 4 Gemini images = ~58 credits
 *
 * Credit estimation is handled by credit-estimator.ts.
 * Credit deduction/tracking is handled by credit-service.ts.
 */

// Plan Types
export const PLAN_TYPES = {
  FREE: "free",
  PRO: "pro",
  PAYG: "payg",
} as const;

// Subscription Status
export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  NONE: "none",
} as const;

// Plan Configurations
export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    priceYearly: 0,
    description: "Try it out with monthly credits",
    dailyLimit: null, // No daily limit - uses monthly credits
    creditsIncluded: 100, // ~7 articles/month
    features: [
      { text: "100 credits/month (~7 articles)", included: true },
      { text: "Up to 1,000 words per article", included: true },
      { text: "Up to 3 images per article", included: true },
      { text: "Flux image generation only", included: true },
      { text: "All article templates", included: true },
      { text: "Single WordPress export", included: true },
      { text: "Bulk generation", included: false },
      { text: "Bulk WordPress export", included: false },
      { text: "Gemini/premium images", included: false },
      { text: "Cluster mode", included: false },
    ],
    imageProviders: ["flux-dev", "flux-schnell"] as const,
    stripePriceId: null,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 99,
    priceYearly: 79, // ~20% discount
    description: "For content creators and marketers",
    dailyLimit: null, // No daily limit - uses monthly credits
    creditsIncluded: 2_000,
    features: [
      { text: "2,000 credits/month (~125 articles)", included: true },
      { text: "Up to 5,000 words per article", included: true },
      { text: "Bulk article generation", included: true },
      { text: "Flux images included", included: true },
      { text: "Gemini premium images available", included: true },
      { text: "Single WordPress export", included: true },
      { text: "Bulk WordPress export", included: true },
      { text: "Cluster mode", included: true },
    ],
    imageProviders: ["flux-dev", "flux-schnell", "flux-2", "gemini-3-pro-image-preview", "imagen-3.0-generate-002"] as const,
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO || null,
  },
  payg: {
    id: "payg",
    name: "Pay as you go",
    price: 0, // no subscription fee
    priceYearly: null, // not applicable
    description: "Pay only for what you use",
    dailyLimit: null,
    creditsIncluded: 0, // top-up model
    features: [
      { text: "~$0.80 per article (1000 words)", included: true },
      { text: "All Pro features", included: true },
      { text: "No monthly commitment", included: true },
      { text: "Top-up as needed", included: true },
    ],
    imageProviders: ["flux-dev", "flux-schnell", "flux-2", "gemini-3-pro-image-preview", "imagen-3.0-generate-002"] as const,
    stripePriceId: null, // uses one-time payments
  },
} as const;

// Credit Costs — aligned with credit-estimator.ts
// See TEXT_CREDIT_RATES and IMAGE_CREDIT_RATES in credit-estimator.ts for authoritative values
export const CREDIT_COSTS = {
  // Text: 5 credits per 1,000 words (with complexity multipliers 1.0–1.3)
  textCreditsPerThousandWords: 5,

  // Image costs (credits per image) — mirrors IMAGE_CREDIT_RATES
  images: {
    "flux-dev": 2,
    "flux-schnell": 2,
    "flux-2": 2,
    "gemini-3-pro-image-preview": 13,
    "imagen-3.0-generate-002": 13,
  } as const,

  // Estimated images per 1000 words (for UI estimation)
  estimatedImagesPerThousandWords: 4,
} as const;

// Cost per credit in USD (for PAYG pricing)
export const USD_PER_CREDIT = 0.05;

// Credit package sizes for Pay-as-you-go
export const CREDIT_PACKAGES = [
  { id: "credits_100", credits: 100, price: 5, label: "100 Credits" },
  { id: "credits_500", credits: 500, price: 25, label: "500 Credits" },
  { id: "credits_1000", credits: 1_000, price: 50, label: "1000 Credits", popular: true },
  { id: "credits_5000", credits: 5_000, price: 250, label: "5000 Credits", savings: "Best value" },
] as const;

// Credit transaction types
export const CREDIT_TRANSACTION_TYPES = {
  GENERATION: "generation",
  IMAGE: "image",
  TOPUP: "topup",
  RESET: "reset",
  REFUND: "refund",
  ADJUSTMENT: "adjustment",
} as const;

// Credit sources for waterfall deduction
export const CREDIT_SOURCES = {
  DAILY: "daily",
  MONTHLY: "monthly",
  PAYG: "payg",
  OVERAGE: "overage",
} as const;

// Daily quota reset time (UTC)
export const QUOTA_RESET_HOUR_UTC = 0; // Midnight UTC
