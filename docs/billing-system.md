# SCAI Billing System — Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Subscription Plans](#subscription-plans)
3. [Credit System](#credit-system)
4. [Credit Estimation (How Credits Are Calculated)](#credit-estimation)
5. [Credit Deduction Waterfall](#credit-deduction-waterfall)
6. [AI Provider Costs (Our Actual Expenses)](#ai-provider-costs)
7. [Revenue & Margin Analysis](#revenue--margin-analysis)
8. [Stripe Integration](#stripe-integration)
9. [Feature Access Control](#feature-access-control)
10. [Database Schema](#database-schema)
11. [Key Files Reference](#key-files-reference)

---

## Overview

SCAI uses a **credit-based billing system** where users spend credits to generate articles. Credits are the universal currency — they abstract away the varying costs of different AI providers, image generators, and article complexities into a single, predictable number.

**Core equation**: `1 credit = $0.05 of user-facing value`

Revenue flows from three sources:
- **Free tier**: 100 credits/month (acquisition funnel, no revenue)
- **Pro subscription**: $99/month for 2,000 credits ($0.0495/credit effective rate)
- **Pay-as-you-go (PAYG)**: Credit packs purchased at $0.05/credit

---

## Subscription Plans

### Free Plan
| Property | Value |
|----------|-------|
| Price | $0/month |
| Monthly credits | 100 |
| Estimated articles/month | ~6-7 (depending on type/word count) |
| Max word count | 1,000 words |
| Max images/article | 3 |
| Image providers | Flux only |
| Bulk generation | No |
| WordPress export | Single only |
| API access | No |

### Pro Plan
| Property | Value |
|----------|-------|
| Price | $99/month (or $79/month billed yearly) |
| Monthly credits | 2,000 |
| Estimated articles/month | ~65-125 (depending on type/word count) |
| Max word count | 5,000 words |
| Max images/article | 10 |
| Image providers | Flux + Gemini |
| Bulk generation | Yes (up to 50 articles/job) |
| WordPress export | Single + Bulk |
| API access | Yes |
| Overage | Yes, up to 100 credits (default cap), billed at $0.05/credit |
| Cluster mode | Yes |

### Pay-as-You-Go (PAYG)
| Property | Value |
|----------|-------|
| Monthly fee | $0 |
| Monthly credits | 0 (top-up model) |
| Credit rate | $0.05 per credit |
| Features | All Pro features |
| Credit packs available | See below |

### Credit Packs (PAYG)
| Pack | Credits | Price | Per-credit cost |
|------|---------|-------|-----------------|
| Starter | 100 | $5.00 | $0.050 |
| Standard | 500 | $25.00 | $0.050 |
| Popular | 1,000 | $50.00 | $0.050 |
| Best Value | 5,000 | $250.00 | $0.050 |

All packs are priced at the same flat rate of $0.05/credit — no volume discounts.

---

## Credit Estimation

Credits are estimated **before** generation begins and deducted upfront. The estimation uses a structure-based calculation that mirrors the actual article generation pipeline.

### Formula

```
totalCredits = baseTextCredits + imageCredits + overheadCredits
```

Where:
- **baseTextCredits** = `ceil(wordCount / 1000) * 5`
- **imageCredits** = `imageCount * creditsPerImage`
- **overheadCredits** = flat per-type amount for extra AI calls

### Text Credits

All article types share the same text rate:

| Words | Credits |
|-------|---------|
| 500 | 3 |
| 1,000 | 5 |
| 1,500 | 8 |
| 2,000 | 10 |
| 3,000 | 15 |
| 5,000 | 25 |

### Image Credits

| Provider | Models | Credits/image | Our cost/image |
|----------|--------|---------------|----------------|
| Flux | flux-dev, flux-schnell, flux-2 | **2** | $0.012–$0.025 |
| Gemini | gemini-3-pro-image-preview, imagen-3.0-generate-002 | **13** | $0.04–$0.13 |
| None | (text only) | **0** | $0.00 |

### Image Count Calculation

Image counts are calculated precisely from the article structure, not estimated. The system replicates the orchestrator's exact H2 formula:

**Step 1: Calculate dynamic H2 count** (mirrors `unified-orchestrator.ts`)

```
available = wordCount - fixedWords - uniqueBudget
dynamicH2Count = floor_or_round(available / wordsPerSection)
```

Each article type has fixed structure parameters:

| Type | Unique Budget | Fixed H2s | Fixed Words | Words/Section | Mode |
|------|--------------|-----------|-------------|---------------|------|
| Affiliate | 200 | 0 | 300 | 180 | floor |
| Commercial | 250 | 1 | 300 | 180 | floor |
| Comparison | 350 | 0 | 300 | 180 | floor |
| How-To | 180 | 2 | 300 | 180 | floor |
| Informational | 180 | 1 | 300 | 180 | round |
| Listicle | 120 | 1 | 300 | 180 | floor |
| Local | 120 | 1 | 300 | 180 | floor |
| Recipe | 550 | 4 | 300 | 180 | floor |
| Review | 380 | 3 | 350 | 160 | floor |

Special rules:
- Minimum 2 total H2s (fixedH2s + dynamicH2Count)
- Maximum 6 dynamic H2s
- Listicle: force odd count, minimum 5
- Affiliate: defaults to 3 (typical product count from Amazon search)

**Step 2: Calculate image count** (from `data/structure-flows.ts`)

Each H2 in the article flow generates 1 image. Additional images come from:

| Component | Source | Count |
|-----------|--------|-------|
| Featured image | Always | 1 |
| Dynamic H2 images | 1 per dynamic H2 | varies |
| Fixed flow H2 images | 1 per fixed H2 in flow | varies by type |
| Product card images | Affiliate only (1 per product) | 3 (default) |
| Component images | Local only (why-choose-local) | 1 |

Fixed flow H2s per type (extra H2s the flow builder adds beyond the dynamic loop):
| Type | Fixed Flow H2s |
|------|---------------|
| Affiliate | 0 (product cards ARE the H2s) |
| Commercial | 1 (feature list) |
| Comparison | 2 (topic H2s) |
| How-To | 2 (materials + pro tips) |
| Informational | 0 |
| Listicle | 0 |
| Local | 0 |
| Recipe | 1 (tips) |
| Review | 2 (features + pros/cons) |

**Affiliate special case**: Each product generates TWO images — one H2 section image and one product card image. With 3 products: 1 featured + 3 H2 images + 3 product card images = **7 images**.

### Overhead Credits

Flat per-type credit amount for AI calls beyond base content generation (Phase 0, pre-generation, unique component generation, classification):

| Type | Overhead | What it covers |
|------|----------|----------------|
| Affiliate | 4 | Phase 0: inference + validation + name cleaning + product cards |
| Commercial | 1 | Feature list generation |
| Comparison | 2 | Comparison extract + table + verdict |
| How-To | 1 | Materials box + pro tips |
| Informational | 1 | Key takeaways + quick facts |
| Listicle | 1 | Honorable mentions |
| Local | 1 | Why choose local |
| Recipe | 2 | Pre-gen: ingredients + instructions + nutrition |
| Review | 2 | Pre-gen: features + pros/cons + rating |

### Complete Credit Estimates (1,000 words, Flux images)

| Type | Text | Images | Image Credits | Overhead | **Total** |
|------|------|--------|---------------|----------|-----------|
| **Affiliate** | 5 | 7 | 14 | 4 | **23** |
| **Commercial** | 5 | 4 | 8 | 1 | **14** |
| **Comparison** | 5 | 5 | 10 | 2 | **17** |
| **How-To** | 5 | 5 | 10 | 1 | **16** |
| **Informational** | 5 | 4 | 8 | 1 | **14** |
| **Listicle** | 5 | 6 | 12 | 1 | **18** |
| **Local** | 5 | 5 | 10 | 1 | **16** |
| **Recipe** | 5 | 2 | 4 | 2 | **11** |
| **Review** | 5 | 4 | 8 | 2 | **15** |

**Average: ~16 credits per 1,000-word Flux article**

### Credit Estimates at Higher Word Counts (Flux)

| Type | 1,000w | 1,500w | 2,000w | 3,000w |
|------|--------|--------|--------|--------|
| Affiliate | 23 | 36 | 40 | 45 |
| Commercial | 14 | 25 | 27 | 32 |
| Informational | 14 | 25 | 25 | 30 |
| Recipe | 11 | 22 | 28 | 33 |
| Listicle | 18 | 27 | 27 | 32 |

### Credit Estimates with Gemini Images (1,000 words)

| Type | Flux | Gemini | Difference |
|------|------|--------|------------|
| Affiliate | 23 | 100 | +77 |
| Commercial | 14 | 58 | +44 |
| Informational | 14 | 58 | +44 |
| Listicle | 18 | 84 | +66 |
| Recipe | 11 | 33 | +22 |

Gemini images cost ~6.5x more credits than Flux.

---

## Credit Deduction Waterfall

When an article is generated, credits are deducted in a specific order:

```
1. Daily allocation   → (legacy, currently 0 for all tiers)
2. Monthly allocation → Free: 100/mo, Pro: 2,000/mo
3. PAYG balance       → Purchased credit packs
4. Overage            → Pro only, default cap of 100 credits at $0.05/credit
```

If insufficient credits at all levels → `InsufficientCreditsError` is thrown and generation is blocked.

### Monthly Reset
- **Free tier**: Resets when billing period ends (30 days from account creation)
- **Pro tier**: Resets on each Stripe invoice.paid event (monthly billing cycle)
- Unused credits do NOT roll over
- Overage counter resets at the same time as monthly credits

### Refunds
- Refunds are credited to the PAYG balance (simplest approach)
- Recorded as a credit transaction with positive amount

---

## AI Provider Costs

### Text Generation Models

| Model | Provider | Input $/1K tokens | Output $/1K tokens | Tier |
|-------|----------|-------------------|-------------------|------|
| gemini-2.0-flash | Gemini | $0.0001 | $0.0004 | fast |
| gemini-1.5-pro | Gemini | $0.00125 | $0.005 | powerful |
| gemini-3-flash-preview | Gemini | $0.0005 | $0.003 | fast |
| claude-3-haiku | Claude | $0.00025 | $0.00125 | fast |
| claude-3.5-sonnet | Claude | $0.003 | $0.015 | default |
| gpt-4o-mini | OpenAI | $0.00015 | $0.0006 | fast |
| gpt-4o | OpenAI | $0.0025 | $0.01 | default |

**Primary model for content generation**: Gemini 2.0 Flash (cheapest at $0.10/1M input, $0.40/1M output)

### Image Generation Costs

| Model | Provider | Cost/image | Credit charge |
|-------|----------|-----------|---------------|
| flux-2 (Dev) | Flux (fal.ai) | $0.012 | 2 credits ($0.10) |
| flux-dev | Flux (fal.ai) | $0.025 | 2 credits ($0.10) |
| flux-2-edit | Flux (fal.ai) | $0.024 | 2 credits ($0.10) |
| gemini-3-pro-image-preview | Google | $0.13 | 13 credits ($0.65) |
| imagen-3.0-generate-002 | Google | $0.04 | 13 credits ($0.65) |

### Cost Storage
All costs are stored in **micro-dollars** (USD × 1,000,000) as integers in SQLite for precision. Example: $0.025 is stored as 25,000.

---

## Revenue & Margin Analysis

### Per-Credit Economics

| Metric | Value |
|--------|-------|
| Revenue per credit (PAYG) | $0.050 |
| Revenue per credit (Pro monthly) | $0.0495 ($99 / 2,000) |
| Revenue per credit (Pro yearly) | $0.0395 ($79 × 12 / 2,000 × 12) |

### Actual AI Cost Per Article (1,000 words, Flux images)

A typical article uses Gemini 2.0 Flash for text generation. Estimated token usage per article: ~15K-25K input tokens, ~3K-5K output tokens.

**Text generation cost** (Gemini Flash, typical 1,000-word article):
- Input: ~20K tokens × ($0.0001/1K) = $0.002
- Output: ~4K tokens × ($0.0004/1K) = $0.0016
- **Total text AI cost ≈ $0.004**

**Image generation cost** (Flux 2 Dev):
- Per image: $0.012
- 4 images (typical): $0.048
- 7 images (affiliate): $0.084

**Overhead AI calls** (extra generateObject calls for components):
- Each call: ~$0.001-$0.003
- 1-4 extra calls: ~$0.003-$0.012

### Per-Article Cost & Margin Table (1,000 words, Flux)

| Type | Credits | Revenue | AI Cost | **Gross Margin** | **Margin %** |
|------|---------|---------|---------|------------------|--------------|
| **Affiliate** | 23 | $1.15 | ~$0.10 | $1.05 | **91%** |
| **Commercial** | 14 | $0.70 | ~$0.06 | $0.64 | **91%** |
| **Comparison** | 17 | $0.85 | ~$0.07 | $0.78 | **92%** |
| **How-To** | 16 | $0.80 | ~$0.07 | $0.73 | **91%** |
| **Informational** | 14 | $0.70 | ~$0.06 | $0.64 | **91%** |
| **Listicle** | 18 | $0.90 | ~$0.08 | $0.82 | **91%** |
| **Local** | 16 | $0.80 | ~$0.07 | $0.73 | **91%** |
| **Recipe** | 11 | $0.55 | ~$0.03 | $0.52 | **95%** |
| **Review** | 15 | $0.75 | ~$0.06 | $0.69 | **92%** |

**Average margin with Flux images: ~92%**

### Per-Article Cost & Margin (1,000 words, Gemini images)

| Type | Credits | Revenue | AI Cost | **Gross Margin** | **Margin %** |
|------|---------|---------|---------|------------------|--------------|
| **Informational** | 58 | $2.90 | ~$0.52 | $2.38 | **82%** |
| **Affiliate** | 100 | $5.00 | ~$0.93 | $4.07 | **81%** |
| **Listicle** | 84 | $4.20 | ~$0.80 | $3.40 | **81%** |

**Average margin with Gemini images: ~81%**

### Per-User Monthly Revenue Scenarios

#### Free User (100 credits/month)
- Revenue: $0.00 (included in plan)
- Cost if fully used: ~$0.40 (assuming 6 typical articles)
- **Net: -$0.40/month** (acquisition cost)

#### Pro User ($99/month, 2,000 credits)
- Revenue: $99.00
- If 100% utilization (2,000 credits, ~125 articles): AI cost ~$8.00
- If 50% utilization (1,000 credits, ~63 articles): AI cost ~$4.00
- **Net at 100% utilization: ~$91/month (92% margin)**
- **Net at 50% utilization: ~$95/month (96% margin)**

#### Pro Yearly User ($79/month, 2,000 credits)
- Revenue: $79.00/month ($948/year)
- If 100% utilization: AI cost ~$8.00/month
- **Net at 100% utilization: ~$71/month (90% margin)**

#### PAYG User (variable)
- Revenue: $0.05 per credit
- If buying 1,000-credit pack ($50) and using all:
  - AI cost: ~$4.00
  - **Net: ~$46.00 (92% margin)**

### Revenue Per Dollar Analysis

For every $1 the user spends:
- **~$0.06-$0.10** goes to AI provider costs (text + images)
- **~$0.90-$0.94** is gross margin

For Stripe fees (2.9% + $0.30 per transaction):
- $99 Pro subscription: ~$3.17 Stripe fee → net $95.83
- $50 credit pack: ~$1.75 Stripe fee → net $48.25
- $5 credit pack: ~$0.45 Stripe fee → net $4.55 (9% fee!)

### Effective Revenue After All Costs

| Plan | User Pays | Stripe Fee | AI Cost (est.) | **Net Revenue** | **Net Margin** |
|------|-----------|-----------|----------------|-----------------|----------------|
| Pro Monthly | $99.00 | ~$3.17 | ~$8.00 | **$87.83** | **89%** |
| Pro Yearly | $79.00 | ~$2.59 | ~$8.00 | **$68.41** | **87%** |
| PAYG $50 pack | $50.00 | ~$1.75 | ~$4.00 | **$44.25** | **89%** |
| PAYG $5 pack | $5.00 | ~$0.45 | ~$0.40 | **$4.15** | **83%** |

---

## Stripe Integration

### Architecture

```
User → Checkout Page → Stripe Checkout Session → Payment
                                                      ↓
                                              Stripe Webhook
                                                      ↓
                                      POST /api/webhooks/stripe
                                                      ↓
                              billing-service.ts (process event)
                                                      ↓
                              credit-service.ts (update balances)
```

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` (subscription) | Create subscription, upgrade to Pro, grant 2,000 credits |
| `checkout.session.completed` (payment) | Add PAYG credits from pack metadata |
| `invoice.paid` | Reset monthly credits, update billing period |
| `invoice.payment_failed` | Set status to `past_due` |
| `customer.subscription.updated` | Sync status (active, past_due, canceled, etc.) |
| `customer.subscription.deleted` | Cancel subscription, downgrade to free |

### Idempotency
Every Stripe event is processed through `processEventIdempotently()`:
1. Check if `stripeEventId` exists in `billing_events` table
2. If yes → skip (return `{ skipped: true }`)
3. If no → process event, then record in `billing_events`

This prevents double-processing if Stripe retries webhook delivery.

### Environment Variables Required
| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe API authentication |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Stripe Price ID for Pro monthly |
| `STRIPE_PRO_YEARLY_PRICE_ID` | Stripe Price ID for Pro yearly |
| `STRIPE_CREDIT_PACK_100_PRICE_ID` | Price ID for 100-credit pack |
| `STRIPE_CREDIT_PACK_500_PRICE_ID` | Price ID for 500-credit pack |
| `STRIPE_CREDIT_PACK_1000_PRICE_ID` | Price ID for 1000-credit pack |
| `STRIPE_CREDIT_PACK_5000_PRICE_ID` | Price ID for 5000-credit pack |

---

## Feature Access Control

Feature access is controlled by `lib/services/access-service.ts` based on subscription tier.

### Feature Matrix

| Feature | Anonymous | Free | Pro |
|---------|-----------|------|-----|
| Generate articles | Yes (1/day) | Yes | Yes |
| Max word count | 800 | 1,000 | 5,000 |
| Max images/article | 2 | 3 | 10 |
| Image providers | Flux | Flux | Flux + Gemini |
| Bulk generation | No | No | Yes (max 50) |
| Single WP export | No | Yes | Yes |
| Bulk WP export | No | No | Yes |
| API access | No | No | Yes |
| Advanced models | No | No | Yes |
| Priority queue | No | No | Yes |
| Cluster mode | No | No | Yes |

### Anonymous Users
- Tracked by fingerprint + IP address in `anonymous_usage` table
- Daily usage counter resets at midnight UTC
- Very limited: 1 article/day, 800 words max, 2 images max, Flux only

### Whitelabel Users
- Emails matching `@whitelabelresell.com` get unlimited credits (999,999)
- Treated as Pro tier for all feature checks
- Checked via `hasUnlimitedQuota()` in `lib/auth`

---

## Database Schema

### Core Billing Tables

#### `credit_balances` (one per user)
| Column | Type | Description |
|--------|------|-------------|
| userId | text | Unique per user |
| tier | text | "free", "pro", or "payg" |
| monthlyCredits | integer | Allocated monthly (100 free, 2000 pro) |
| monthlyUsed | integer | Credits consumed this month |
| billingPeriodStart | integer | Unix timestamp |
| billingPeriodEnd | integer | Unix timestamp |
| paygBalance | integer | Purchased credits remaining |
| dailyCredits | integer | Legacy (now 0 for all) |
| dailyUsed | integer | Legacy |
| dailyResetDate | text | YYYY-MM-DD |
| overageCreditsUsed | integer | Pro overage consumed |
| overageCap | integer | Max overage (default 100, null = unlimited) |
| stripeCustomerId | text | Stripe customer reference |
| stripeSubscriptionId | text | Stripe subscription reference |

#### `credit_transactions` (audit log)
| Column | Type | Description |
|--------|------|-------------|
| userId | text | Who |
| amount | integer | Positive = credit, negative = debit |
| balanceAfter | integer | Balance after transaction |
| type | text | "deduction", "purchase", "refund", "monthly_reset" |
| source | text | "daily", "monthly", "payg", "overage" |
| historyId | text | Links to generation_history |
| bulkJobId | text | Links to bulk_jobs |
| stripePaymentId | text | Links to Stripe payment |

#### `subscriptions`
| Column | Type | Description |
|--------|------|-------------|
| userId | text | Owner |
| stripeCustomerId | text | Stripe customer |
| stripeSubscriptionId | text | Stripe subscription |
| stripePriceId | text | Which price they're on |
| status | text | "none", "active", "past_due", "canceled" |
| planType | text | "free", "pro", "payg" |
| creditsIncluded | integer | Monthly allocation |
| creditsUsed | integer | Used this period |
| currentPeriodStart | integer | Billing period start |
| currentPeriodEnd | integer | Billing period end |
| cancelAtPeriodEnd | integer | Boolean flag |

#### `billing_events` (idempotency)
| Column | Type | Description |
|--------|------|-------------|
| stripeEventId | text | Unique Stripe event ID |
| eventType | text | "checkout.session.completed", etc. |
| processedAt | integer | When we processed it |
| payload | text | JSON event data |

### Cost Tracking Tables

#### `ai_usage_logs` (per API call)
| Column | Type | Description |
|--------|------|-------------|
| historyId | text | Which article |
| userId | text | Who |
| provider | text | "gemini", "claude", "openai", "flux" |
| modelId | text | Specific model used |
| operationType | text | "text", "object", "stream", "image" |
| inputTokens | integer | Tokens consumed |
| outputTokens | integer | Tokens produced |
| imageCount | integer | Images generated |
| inputCostUsd | integer | Micro-dollars |
| outputCostUsd | integer | Micro-dollars |
| imageCostUsd | integer | Micro-dollars |
| totalCostUsd | integer | Micro-dollars |

#### `generation_cost_summaries` (per article, aggregated)
| Column | Type | Description |
|--------|------|-------------|
| historyId | text | Unique per article |
| geminiCostUsd | integer | Micro-dollars for Gemini |
| claudeCostUsd | integer | Micro-dollars for Claude |
| openaiCostUsd | integer | Micro-dollars for OpenAI |
| fluxCostUsd | integer | Micro-dollars for Flux |
| imageCostUsd | integer | Micro-dollars for all images |
| totalCostUsd | integer | Sum of all costs |
| apiCallCount | integer | Number of AI calls |
| durationMs | integer | Total generation time |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `lib/billing/constants.ts` | Plan configs, credit packs, pricing constants |
| `lib/services/credit-estimator.ts` | Structure-based credit estimation (before generation) |
| `lib/services/credit-service.ts` | Credit balance management, waterfall deduction, refunds |
| `lib/services/billing-service.ts` | Subscription lifecycle, Stripe event processing |
| `lib/services/stripe-service.ts` | Stripe API: checkout sessions, portal, customer management |
| `lib/services/access-service.ts` | Feature access control by tier |
| `lib/services/cost-tracking-service.ts` | AI usage logging, cost calculation, summaries |
| `lib/ai/models.ts` | Model specs, token pricing, image pricing |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `app/api/credits/estimate/route.ts` | Credit estimation API endpoint |
| `drizzle/schema.ts` | Database schema definitions |

---

## How We Determined Credit Values

### Design Principles

1. **1 credit ≈ $0.05**: Simple mental model for users. A Pro user paying $99 gets 2,000 credits — easy to reason about.

2. **Text credits (5 per 1,000 words)**: Based on Gemini Flash cost ($0.004/article for text) with ~25x markup. This ensures even if we fall back to more expensive models (GPT-4o at ~$0.03/article), we still maintain healthy margins.

3. **Flux image credits (2 per image)**: Flux 2 Dev costs $0.012/image, we charge 2 credits = $0.10. That's an 8.3x markup, which covers:
   - The occasional failed generation that needs retry
   - R2 storage costs for hosting images
   - Bandwidth costs for serving images

4. **Gemini image credits (13 per image)**: Gemini image generation costs $0.13/image (at full resolution), we charge 13 credits = $0.65. That's a 5x markup, slightly less than Flux because Gemini is already a premium option — we don't want to price it prohibitively.

5. **Overhead credits**: Flat per-type amounts that account for the AI calls beyond text generation — things like Phase 0 product inference (affiliate), ingredient extraction (recipe), comparison tables, etc. These are set based on the number of extra `generateObject` calls each type makes.

### Why Not Per-Token Billing?

We considered per-token billing but rejected it because:
- Users can't predict costs (token counts are opaque)
- Small variations in prompt/output would cause fluctuating bills
- Image costs dominate article costs, not tokens
- Credits provide a simpler, more predictable user experience

### Margin Philosophy

We target **90-95% gross margins** on AI costs:
- This accounts for Stripe fees (~3%)
- Infrastructure costs (Vercel, R2, database hosting)
- Failed generations that consume AI resources but get refunded
- Provider price changes (cushion against rate increases)
- The actual product value (we're selling the article generation system, not raw API access)
