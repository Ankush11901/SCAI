# Billing System Implementation Plan

> **Status:** In Progress  
> **Last Updated:** February 12, 2026  
> **Owner:** @Mustapha

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Phase 1: Database Schema](#phase-1-database-schema)
4. [Phase 2: UI Components](#phase-2-ui-components)
5. [Phase 3: Service Layer](#phase-3-service-layer)
6. [Phase 4: API Routes](#phase-4-api-routes)
7. [Phase 5: Integration Points](#phase-5-integration-points)
8. [Phase 6: Scheduled Tasks](#phase-6-scheduled-tasks)
9. [Phase 7: Environment & Configuration](#phase-7-environment--configuration)
10. [Verification & Testing](#verification--testing)
11. [File Manifest](#file-manifest)

---

## Overview

Implementing a **credit-based billing system** with Stripe integration covering:
- Three tiers: **Free** (3 credits/day), **Pro** ($99/mo, 2000 credits), **PAYG** (buy packs)
- Anonymous user support with browser fingerprinting
- Credit deduction waterfall: Daily → Monthly → PAYG → Overage
- Post-generation reconciliation (estimate vs actual)
- API token management UI

### Pricing Model

| Tier | Price | Credits | Features |
|------|-------|---------|----------|
| Free | $0 | 3/day | Flux only, max 1000 words, no bulk |
| Pro | $99/mo | 2000/mo | All features, overage at $0.06/credit |
| PAYG | Variable | Never expire | All features, $0.05/credit |

### Credit Costs

| Image Provider | Credits/Image |
|----------------|---------------|
| Flux | 3 |
| Gemini | 13 |

---

## Architecture Decisions

- [x] **Credit-based** (not word-based) for cost-proportional billing
- [x] **Credit Deduction Waterfall:** Daily → Monthly → PAYG → Overage
- [x] **Anonymous Support:** Browser fingerprint + IP tracking
- [x] **Stripe Customer Portal** for payment method management
- [x] **Idempotency:** All webhooks checked against `billingEvents` table
- [x] **Micro-dollars:** Store costs as integers (USD × 1,000,000)
- [x] **Optimistic Deduction:** Deduct before generation, reconcile after
- [x] **Dual Reset Safety:** Webhook primary, cron backup

---

## Phase 1: Database Schema

### New Tables

- [x] **1.1** Create `credit_balances` table migration ✅
  ```
  drizzle/0008_striped_exiles.sql
  ```
  
  | Column | Type | Description |
  |--------|------|-------------|
  | `id` | TEXT PK | UUID |
  | `user_id` | TEXT FK UNIQUE | → users.id |
  | `tier` | TEXT | 'free' \| 'pro' \| 'payg' |
  | `monthly_credits` | INTEGER | Pro allocation (2000) |
  | `monthly_used` | INTEGER | Used this billing period |
  | `billing_period_start` | INTEGER | Timestamp |
  | `billing_period_end` | INTEGER | Timestamp |
  | `payg_balance` | INTEGER | Purchased credits (never expire) |
  | `daily_credits` | INTEGER | Free tier limit (3) |
  | `daily_used` | INTEGER | Used today |
  | `daily_reset_date` | TEXT | 'YYYY-MM-DD' |
  | `overage_credits_used` | INTEGER | Overage this period |
  | `overage_cap` | INTEGER NULL | Max overage (null = unlimited) |
  | `stripe_customer_id` | TEXT | Stripe customer ID |
  | `stripe_subscription_id` | TEXT | Stripe subscription ID |
  | `created_at` | INTEGER | Timestamp |
  | `updated_at` | INTEGER | Timestamp |

- [x] **1.2** Create `anonymous_usage` table migration ✅
  ```
  drizzle/0008_striped_exiles.sql
  ```
  
  | Column | Type | Description |
  |--------|------|-------------|
  | `id` | TEXT PK | UUID |
  | `fingerprint` | TEXT | Browser fingerprint hash |
  | `ip_address` | TEXT | Client IP |
  | `daily_used` | INTEGER | Credits used today |
  | `daily_reset_date` | TEXT | 'YYYY-MM-DD' |
  | `created_at` | INTEGER | Timestamp |
  | `updated_at` | INTEGER | Timestamp |
  
  Index: `UNIQUE(fingerprint, ip_address)`

- [x] **1.3** Update `lib/db/schema.ts` with new table definitions and relations ✅

- [x] **1.4** Verify existing tables have required columns: ✅
  - [x] `creditTransactions.source` column exists
  - [x] `billingEvents.stripeEventId` unique index exists
  - [x] `apiTokens` table exists

- [x] **1.5** Run migration: `npx drizzle-kit push` ✅

---

## Phase 2: UI Components

### Billing Components (`components/billing/`)

- [x] **2.1** `CurrentPlanCard.tsx`
  - Plan name, price, billing cycle
  - Features checklist
  - Credits used/remaining progress bar
  - "Upgrade" / "Manage Subscription" buttons

- [x] **2.2** `PlanSelector.tsx`
  - Three-tier comparison cards (Free/Pro/PAYG)
  - Monthly/Yearly toggle (Pro gets 20% discount on yearly)
  - "Current Plan" badge
  - "Subscribe Now" / "Buy Credits" CTAs

- [x] **2.3** `PaymentMethods.tsx`
  - List cards with brand icon, last 4, expiry
  - Primary/Secondary badges
  - "Make Primary" / "Remove" / "Edit" actions
  - "Add Backup" button

- [x] **2.4** `BillingHistory.tsx`
  - Paginated invoice table
  - Columns: Invoice #, Amount, Status, Date, Download
  - Status badges: Paid (green), Pending (yellow), Failed (red)

- [x] **2.5** `CreditEstimateBadge.tsx`
  - Real-time credit estimate on generate form
  - Updates as user changes: word count, article type, image provider
  - Shows: "Estimated: 19 credits (~$0.95)"
  - "Your Balance: 1,847 credits"

- [x] **2.6** `UpgradePrompt.tsx`
  - Modal when credits insufficient
  - Shows: required credits, current balance
  - CTAs: "Buy Credits" / "Upgrade to Pro"

- [x] **2.7** `PurchaseCredits.tsx`
  - Credit pack selection cards
  - Packs: 100 ($5), 500 ($25), 1000 ($50), 5000 ($250)
  - All show "$0.05/credit"

- [x] **2.8** `OverageCapSetting.tsx`
  - Pro users set max overage limit
  - Input: dollar amount or "Unlimited"
  - Shows current overage usage

- [x] **2.9** `index.ts` - Barrel export file

### Usage Components (`components/usage/`)

- [x] **2.10** `UsageStats.tsx`
  - Stat cards grid
  - Credits remaining, Generations today, Articles this period, Images generated

- [x] **2.11** `UsageOverview.tsx`
  - Chart component (bar/line)
  - Period selector: Days / Weeks / Months
  - Previous/Next navigation

- [x] **2.12** `LimitationsTable.tsx`
  - Resource limits with progress bars
  - Rows: Daily generations, Word count limit, Image provider access
  - Reset date display

- [x] **2.13** `CreditBreakdown.tsx`
  - Shows credit sources breakdown
  - Daily (Free), Monthly (Pro), PAYG, Overage
  - Visual representation with colors

- [x] **2.14** `index.ts` - Barrel export file

### API Token Components (`components/api-tokens/`)

- [x] **2.15** `CreateApiKeyCard.tsx`
  - Name input field
  - "Create API Key" button
  - Shows: current key count / max keys (5)

- [x] **2.16** `ApiKeysList.tsx`
  - List existing keys
  - Shows: name, masked key (`scai_****xxxx`), created date
  - "Delete" action per key

- [x] **2.17** `TokenRevealModal.tsx`
  - One-time token display
  - Warning: "This will only be shown once"
  - Copy to clipboard button
  - "I've saved this key" confirmation

- [x] **2.18** `index.ts` - Barrel export file

---

## Phase 3: Service Layer

### Utilities

- [x] **3.1** `lib/utils/fingerprint.ts`
  ```typescript
  // Client-side fingerprint generation
  export function generateFingerprint(): string
  // Hash of: userAgent + screenRes + timezone + language + platform
  // Store in localStorage as fallback
  // No external library - lightweight implementation
  ```

### Services

- [x] **3.2** `lib/services/credit-estimator.ts`
  ```typescript
  export function estimateArticleCredits(params: {
    wordCount: number;
    imageProvider: 'flux' | 'gemini' | 'none';
    articleType: string;
    imageCount?: number;
  }): number;
  
  export function calculateImageCount(articleType: string, wordCount: number): number;
  
  export const TEXT_CREDIT_RATES: Record<string, number>;
  export const IMAGE_CREDIT_RATES = { flux: 3, gemini: 13 };
  export const ARTICLE_TYPE_COMPLEXITY: Record<string, number>;
  // comparison: +1, review: +1, recipe: +2
  ```

- [x] **3.3** `lib/services/credit-service.ts`
  
  **Core Functions:**
  - [x] `getCreditInfo(userId): Promise<CreditInfo>`
  - [x] `getAnonymousCreditInfo(fingerprint, ip): Promise<CreditInfo>`
  - [x] `hasCreditsAvailable(userId | anonymous, amount): Promise<boolean>`
  - [x] `deductCredits(userId, amount, referenceId, metadata): Promise<CreditTransaction>`
  - [x] `refundCredits(userId, amount, referenceId): Promise<CreditTransaction>`
  - [x] `addPurchasedCredits(userId, amount, paymentId): Promise<CreditTransaction>`
  - [x] `resetMonthlyCredits(userId): Promise<void>`
  - [x] `resetDailyCredits(userId | fingerprint): Promise<void>`
  - [x] `upgradeTier(userId, tier, stripeSubscriptionId?): Promise<void>`
  - [x] `downgradeTier(userId): Promise<void>`
  - [x] `setOverageCap(userId, cap): Promise<void>`
  
  **Credit Deduction Waterfall:**
  ```
  FREE TIER:
    1. Daily allocation (3/day) → InsufficientCreditsError
  
  PRO TIER:
    1. Monthly allocation (2000/mo)
    2. PAYG balance (purchased, never expire)
    3. Overage (if cap not reached, at $0.06/credit)
    4. InsufficientCreditsError
  
  PAYG TIER:
    1. PAYG balance only → InsufficientCreditsError
  ```
  
  **CreditInfo Interface:**
  ```typescript
  interface CreditInfo {
    tier: 'free' | 'pro' | 'payg';
    available: number;
    daily?: { used: number; limit: number; resetsAt: string };
    monthly?: { used: number; limit: number; resetsAt: string };
    paygBalance: number;
    overage?: { used: number; cap: number | null; costSoFar: string };
    isAnonymous: boolean;
  }
  ```
  
  - [x] `class InsufficientCreditsError extends Error`

- [x] **3.4** `lib/services/billing-service.ts`
  - [x] `getSubscription(userId): Promise<Subscription>`
  - [x] `createSubscription(userId, planType, stripeSubscriptionId): Promise<void>`
  - [x] `cancelSubscription(userId): Promise<void>`
  - [x] `updateSubscription(userId, changes): Promise<void>`
  - [x] `getTransactionHistory(userId, pagination): Promise<Transaction[]>`
  - [x] Idempotency key support for all mutations

- [x] **3.5** `lib/services/stripe-service.ts`
  - [x] `createOrGetCustomer(userId, email): Promise<string>`
  - [x] `createCheckoutSession(userId, priceId, mode, successUrl, cancelUrl): Promise<string>`
  - [x] `createCustomerPortalSession(customerId, returnUrl): Promise<string>`
  - [x] `createCreditPurchaseSession(userId, packId): Promise<string>`
  - [x] `constructWebhookEvent(payload, signature): Stripe.Event`
  - [x] `getSubscriptionStatus(subscriptionId): Promise<string>`
  - [x] `cancelSubscription(subscriptionId): Promise<void>`

- [x] **3.6** `lib/services/access-service.ts`
  - [x] `checkGenerationAccess(userId | anonymous, options): Promise<AccessResult>`
  - [x] `canUseImageProvider(userId, provider): Promise<boolean>`
  - [x] `canUseBulkGeneration(userId): Promise<boolean>`
  - [x] `canUseClusterMode(userId): Promise<boolean>`
  - [x] `getMaxWordCount(userId): Promise<number>`
  - [x] `getUserFeatureFlags(userId): Promise<FeatureFlags>`
  
  **Tier Restrictions:**
  | Feature | Free | Pro | PAYG |
  |---------|------|-----|------|
  | Image Provider | Flux only | All | All |
  | Max Word Count | 1000 | Unlimited | Unlimited |
  | Bulk Generation | ❌ | ✅ | ✅ |
  | Cluster Mode | ❌ | ✅ | ✅ |
  | WordPress Export | ❌ | ✅ | ✅ |

- [x] **3.7** Modify `lib/services/quota-service.ts`
  - [x] Add backward compatibility wrapper
  - [x] `incrementQuotaUsage()` → delegates to `deductCredits()`
  - [x] `getQuotaInfo()` → maps `CreditInfo` to old format
  - [x] Keep existing functions working during migration

---

## Phase 4: API Routes

### Credit Routes (`app/api/credits/`)

- [x] **4.1** `route.ts` - GET credit balance + recent transactions
  ```typescript
  // Response: CreditInfo + last 10 transactions
  ```

- [x] **4.2** `estimate/route.ts` - POST estimate credits
  ```typescript
  // Body: { wordCount, articleType, imageProvider, imageCount }
  // Response: { credits, estimatedCost }
  ```

- [x] **4.3** `purchase/route.ts` - POST create Stripe checkout for credit pack
  ```typescript
  // Body: { packId: '100' | '500' | '1000' | '5000' }
  // Response: { checkoutUrl }
  ```

- [x] **4.4** `anonymous/route.ts` - POST check anonymous credits
  ```typescript
  // Body: { fingerprint }
  // Headers: X-Forwarded-For for IP
  // Response: CreditInfo
  ```

### Billing Routes (`app/api/billing/`)

- [x] **4.5** `route.ts` - GET current billing info
  ```typescript
  // Response: { tier, subscription, nextBilling, credits }
  ```

- [x] **4.6** `subscribe/route.ts` - POST create Pro subscription checkout
  ```typescript
  // Body: { period: 'monthly' | 'yearly' }
  // Response: { checkoutUrl }
  ```

- [x] **4.7** `portal/route.ts` - POST create Stripe Customer Portal session
  ```typescript
  // Response: { portalUrl }
  ```

- [x] **4.8** `overage-cap/route.ts` - POST set overage cap
  ```typescript
  // Body: { cap: number | null }
  // Response: { success }
  ```

- [x] **4.9** `history/route.ts` - GET billing/invoice history
  ```typescript
  // Query: { page, limit }
  // Response: { invoices, total, hasMore }
  ```

### Stripe Webhook (`app/api/webhooks/stripe/`)

- [x] **4.10** `route.ts` - POST Stripe webhook handler
  
  **Idempotency:** Check `billingEvents` table before processing
  
  **Events to handle:**
  - [x] `checkout.session.completed`
    - If mode=subscription → `upgradeTier()`
    - If mode=payment → `addPurchasedCredits()`
  - [x] `invoice.paid` → `resetMonthlyCredits()`, charge accumulated overage
  - [x] `customer.subscription.updated` → sync status
  - [x] `customer.subscription.deleted` → `downgradeTier()`
  - [x] `invoice.payment_failed` → flag subscription, notify user

### API Token Routes (`app/api/tokens/`)

- [x] **4.11** `route.ts`
  - [x] GET: List user's API tokens (masked)
  - [x] POST: Create new token (return unhashed once)
  - [x] DELETE: Revoke token by ID

---

## Phase 5: Integration Points

### Generation Routes

- [x] **5.1** Modify `app/api/generate/route.ts`
  - [x] Import credit-related services
  - [x] Fix `canUseImageProvider` to use AccessCheckResult
  - [x] Call `credit-estimator.estimateArticleCredits()`
  - [x] Call `credit-service.deductCredits()` with waterfall
  - [x] Return credit cost in response (streaming and non-streaming)
  - [x] Handle `InsufficientCreditsError` → 402 Payment Required

- [x] **5.2** Modify `app/api/generate/trigger/route.ts`
  - [x] Fix `canUseImageProvider` to use AccessCheckResult

- [x] **5.3** Modify `app/api/bulk/start/route.ts`
  - [x] Fix `canUseImageProvider` to use AccessCheckResult
  - [x] Import credit-related services
  - [x] Estimate total credits for all articles
  - [x] Check available credits before starting bulk job
  - [x] Return 402 if insufficient credits

### Orchestration

- [x] **5.4** Modify `lib/jobs/orchestrate-generation.ts`
  - [x] Import `getGenerationCost` and `refundCredits` from services
  - [x] Add `estimatedCredits` to `OrchestrationPayload` interface
  - [x] After `updateGenerationCostSummary`, compare estimated vs actual
  - [x] Refund difference if actual < estimated (absorb if actual > estimated)
  - [x] Log reconciliation results

- [x] **5.5** Bulk generate already has reconciliation
  - [x] Per-article reconciliation on completion in `lib/jobs/bulk-generate.ts`
  - [x] Update reservation tracking

### Quota Route

- [x] **5.6** Modify `app/api/quota/route.ts`
  - [x] Return both quota and credit info
  - [x] Maintain backward compatibility

### Settings Page

- [x] **5.7** Update `app/(protected)/settings/page.tsx`
  - [x] Replace mock data in `BillingTabContent` with real API calls
  - [x] Connect to `/api/billing/*` routes
  - [x] Replace mock data in `UsageTabContent` with real API calls
  - [x] Connect to `/api/credits/*` routes
  - [x] Replace mock data in `ApiTokensTabContent` with real API calls
  - [x] Connect to `/api/tokens/*` routes

### Layout

- [x] **5.8** Update `components/layout/Sidebar.tsx`
  - [x] Update useQuota hook for new response format
  - [x] Add credit balance display below quota
  - [x] Show total available credits

### Generate Form

- [x] **5.9** Add fingerprint to generate form client
  - [x] Import `generateFingerprint` from `lib/utils/fingerprint`
  - [x] Call `generateFingerprint()` on mount, store in ref
  - [x] Include `X-Fingerprint` header on `/api/generate` and `/api/generate/trigger` requests

- [x] **5.10** Add credit estimate to generate form
  - [x] Add `estimatedCredits`, `userCreditBalance`, `isCalculatingCredits` props to `GeneratorForm`
  - [x] Fetch user balance on mount from `/api/credits`
  - [x] Call `/api/credits/estimate` with debounce when params change
  - [x] Display credit estimate in generate button: "Generate Article · 19 credits"
  - [x] Show available balance with warning color if insufficient

---

## Phase 6: Scheduled Tasks

### Trigger.dev Cron Jobs

- [x] **6.1** Create `lib/jobs/monthly-credit-reset.ts`
  - [x] Runs daily at midnight UTC to check Pro users
  - [x] Reset monthly_used and overage_credits_used for users past billing period
  - [x] Update billing_period_start/end to next month
  - [x] Log credit_transaction with type='reset'
  - [x] Idempotent: checks billing_period_end before resetting

- [x] **6.2** Create `lib/jobs/daily-credit-reset.ts`
  - [x] Runs daily at midnight UTC
  - [x] Reset daily_used = 0 for all free tier users
  - [x] Reset daily_used = 0 for all anonymous_usage rows
  - [x] Update daily_reset_date to today's date
  - [x] Cleanup old anonymous records (>30 days)

---

## Phase 7: Environment & Configuration

### Environment Variables

- [x] **7.1** Add to `env.example.txt`:
  - [x] Stripe keys (secret, publishable, webhook secret)
  - [x] Stripe Price IDs for Pro plan (monthly/yearly)
  - [x] Stripe Price IDs for credit packages (10K, 25K, 50K, 100K)
  - [x] Credit system config (FREE_DAILY_CREDITS, STANDARD_MONTHLY_CREDITS, etc.)

### Stripe Dashboard Setup

- [ ] **7.2** Create Stripe Products (Test Mode):
  - [ ] Product: "SEO Content AI - Pro Plan"
    - [ ] Price: $99/month (recurring)
    - [ ] Price: $950/year (recurring, ~20% discount)
  - [ ] Product: "SEO Content AI - Credits"
    - [ ] Price: 100 credits = $5 (one-time)
    - [ ] Price: 500 credits = $25 (one-time)
    - [ ] Price: 1,000 credits = $50 (one-time)
    - [ ] Price: 5,000 credits = $250 (one-time)

- [ ] **7.3** Configure Stripe Webhook:
  - [ ] Add endpoint: `https://your-domain.com/api/webhooks/stripe`
  - [ ] Select events:
    - `checkout.session.completed`
    - `invoice.paid`
    - `invoice.payment_failed`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
  - [ ] Copy webhook signing secret to `.env`

- [ ] **7.4** Install Stripe CLI for local testing:
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```

---

## Verification & Testing

### Unit Tests

- [ ] **8.1** Credit Estimator Tests
  - [ ] All 9 article types × 4 word counts (500/1000/2000/3000)
  - [ ] × 3 image providers (flux/gemini/none)
  - [ ] Complexity adders: comparison +1, review +1, recipe +2
  - [ ] Image count = 1 (featured) + H2 count

- [ ] **8.2** Credit Service Tests
  - [ ] Deduction waterfall for Free tier
  - [ ] Deduction waterfall for Pro tier (monthly → PAYG → overage)
  - [ ] Deduction waterfall for PAYG tier
  - [ ] Overage cap enforcement
  - [ ] `InsufficientCreditsError` when exhausted
  - [ ] Concurrent deduction protection (DB transaction)
  - [ ] Daily reset logic (date comparison)
  - [ ] Monthly reset logic (billing period)

- [ ] **8.3** Stripe Service Tests (Mock)
  - [ ] Webhook signature verification
  - [ ] Checkout session creation
  - [ ] Customer portal session creation

### Integration Tests

- [ ] **8.4** Single Article Generation (Pro User)
  ```
  1. User has 2,000 monthly credits, 0 used
  2. Generate 1000w informational article with Flux
  3. BEFORE: 19 credits reserved
  4. Generation completes, actual = 16 credits
  5. AFTER: 3 credits refunded
  6. credit_transactions: debit(-19) + refund(+3)
  ```

- [ ] **8.5** Pro Waterfall Test
  ```
  1. Pro user: 5 monthly credits + 10 PAYG credits
  2. Generate article costing 19 credits
  3. Deduction: 5 monthly + 10 PAYG + 4 overage
  4. credit_transactions: 3 rows with different sources
  ```

- [ ] **8.6** Free Tier Block Test
  ```
  1. Free user with 3 credits/day
  2. Request 1000w article (19 credits)
  3. Response: 402 Payment Required
  4. UpgradePrompt shown
  ```

- [ ] **8.7** Webhook Idempotency Test
  ```
  1. Send checkout.session.completed event
  2. Credits added, billingEvents row created
  3. Re-send same event (same stripeEventId)
  4. Second request ignored (no duplicate credits)
  ```

### Manual E2E Checklist

- [ ] **8.8** Anonymous User Flow
  - [ ] Load app without account
  - [ ] Fingerprint generated and stored
  - [ ] Can generate with 3 credits/day
  - [ ] Blocked after 3 credits
  - [ ] Cannot use Gemini images
  - [ ] Cannot bulk generate
  - [ ] Prompt to sign up after generation

- [ ] **8.9** Free Tier (Registered) Flow
  - [ ] Sign up → `credit_balances` row created
  - [ ] Gets 3 credits/day
  - [ ] Blocked from bulk generation
  - [ ] Blocked from Gemini images
  - [ ] Max 1000 words enforced

- [ ] **8.10** Pro Subscription Flow
  - [ ] Click "Subscribe to Pro"
  - [ ] Redirect to Stripe Checkout
  - [ ] Complete payment (test card: 4242...)
  - [ ] Webhook fires, tier upgraded
  - [ ] 2,000 monthly credits available
  - [ ] All features unlocked

- [ ] **8.11** Credit Purchase Flow
  - [ ] Click "Buy 500 Credits"
  - [ ] Redirect to Stripe Checkout
  - [ ] Complete payment
  - [ ] Webhook fires, credits added to PAYG balance
  - [ ] PAYG balance shows 500

- [ ] **8.12** Generation with Credits
  - [ ] Credit estimate shows on form
  - [ ] Estimate updates with options
  - [ ] Generation deducts credits
  - [ ] Post-reconciliation refunds excess
  - [ ] Transaction appears in history

- [ ] **8.13** Overage Flow (Pro)
  - [ ] Set overage cap to $10
  - [ ] Use all monthly + PAYG credits
  - [ ] Generation uses overage
  - [ ] Blocked when cap reached

- [ ] **8.14** Reset Flows
  - [ ] Daily reset: free tier credits restore at midnight
  - [ ] Monthly reset: Pro credits restore on billing date
  - [ ] Cron job handles missed webhooks

- [ ] **8.15** API Tokens
  - [ ] Create token → shown once
  - [ ] Token appears in list (masked)
  - [ ] Delete token → removed from list

---

## File Manifest

### New Files (★)

| Category | Path |
|----------|------|
| Schema | `drizzle/XXXX_add_credit_balances.sql` |
| Schema | `drizzle/XXXX_add_anonymous_usage.sql` |
| Util | `lib/utils/fingerprint.ts` |
| Service | `lib/services/credit-estimator.ts` |
| Service | `lib/services/credit-service.ts` |
| Service | `lib/services/billing-service.ts` |
| Service | `lib/services/stripe-service.ts` |
| Service | `lib/services/access-service.ts` |
| API | `app/api/credits/route.ts` |
| API | `app/api/credits/estimate/route.ts` |
| API | `app/api/credits/purchase/route.ts` |
| API | `app/api/credits/anonymous/route.ts` |
| API | `app/api/billing/route.ts` |
| API | `app/api/billing/subscribe/route.ts` |
| API | `app/api/billing/portal/route.ts` |
| API | `app/api/billing/overage-cap/route.ts` |
| API | `app/api/billing/history/route.ts` |
| API | `app/api/webhooks/stripe/route.ts` |
| API | `app/api/tokens/route.ts` |
| Trigger | `trigger/monthly-credit-reset.ts` |
| Trigger | `trigger/daily-credit-reset.ts` |
| UI | `components/billing/CurrentPlanCard.tsx` |
| UI | `components/billing/PlanSelector.tsx` |
| UI | `components/billing/PaymentMethods.tsx` |
| UI | `components/billing/BillingHistory.tsx` |
| UI | `components/billing/CreditEstimateBadge.tsx` |
| UI | `components/billing/UpgradePrompt.tsx` |
| UI | `components/billing/PurchaseCredits.tsx` |
| UI | `components/billing/OverageCapSetting.tsx` |
| UI | `components/billing/index.ts` |
| UI | `components/usage/UsageStats.tsx` |
| UI | `components/usage/UsageOverview.tsx` |
| UI | `components/usage/LimitationsTable.tsx` |
| UI | `components/usage/CreditBreakdown.tsx` |
| UI | `components/usage/index.ts` |
| UI | `components/api-tokens/CreateApiKeyCard.tsx` |
| UI | `components/api-tokens/ApiKeysList.tsx` |
| UI | `components/api-tokens/TokenRevealModal.tsx` |
| UI | `components/api-tokens/index.ts` |

### Modified Files (✎)

| Category | Path |
|----------|------|
| Schema | `lib/db/schema.ts` |
| Service | `lib/services/quota-service.ts` |
| API | `app/api/generate/route.ts` |
| API | `app/api/generate/trigger/route.ts` |
| API | `app/api/bulk/start/route.ts` |
| API | `app/api/quota/route.ts` |
| Trigger | Orchestration files (reconciliation) |
| Page | `app/(protected)/settings/page.tsx` |
| Layout | `app/(protected)/layout.tsx` |
| Config | `.env.example` |

---

## Progress Summary

| Phase | Tasks | Completed |
|-------|-------|-----------|
| Phase 1: Database | 5 | 5 |
| Phase 2: UI Components | 18 | 18 |
| Phase 3: Services | 7 | 7 |
| Phase 4: API Routes | 11 | 11 |
| Phase 5: Integration | 10 | 10 |
| Phase 6: Scheduled Tasks | 2 | 2 |
| Phase 7: Environment | 4 | 1 |
| Testing | 15 | 0 |
| **Total** | **72** | **54** |

---

## Notes

- All Stripe operations use Test Mode initially
- Switching to Live Mode requires only env var changes
- Idempotency is critical for webhook handling
- Credit deduction must use database transactions to prevent race conditions
- Anonymous users limited to prevent abuse while allowing trial
