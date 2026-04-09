```
 ██████╗██████╗ ███████╗██████╗ ██╗████████╗    ██████╗ ██╗██╗     ██╗     ██╗███╗   ██╗ ██████╗
██╔════╝██╔══██╗██╔════╝██╔══██╗██║╚══██╔══╝    ██╔══██╗██║██║     ██║     ██║████╗  ██║██╔════╝
██║     ██████╔╝█████╗  ██║  ██║██║   ██║       ██████╔╝██║██║     ██║     ██║██╔██╗ ██║██║  ███╗
██║     ██╔══██╗██╔══╝  ██║  ██║██║   ██║       ██╔══██╗██║██║     ██║     ██║██║╚██╗██║██║   ██║
╚██████╗██║  ██║███████╗██████╔╝██║   ██║       ██████╔╝██║███████╗███████╗██║██║ ╚████║╚██████╔╝
 ╚═════╝╚═╝  ╚═╝╚══════╝╚═════╝ ╚═╝   ╚═╝       ╚═════╝ ╚═╝╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝
                    SEO Content AI - Credit-Based Billing System
```

---

# Table of Contents

1. [Context & Problem Statement](#1-context--problem-statement)
2. [Cost Analysis Deep Dive](#2-cost-analysis-deep-dive)
3. [Credit System Architecture](#3-credit-system-architecture)
4. [Tier Design & Pricing](#4-tier-design--pricing)
5. [Database Schema](#5-database-schema)
6. [Service Layer](#6-service-layer)
7. [API Routes](#7-api-routes)
8. [Stripe Integration](#8-stripe-integration)
9. [Frontend Changes](#9-frontend-changes)
10. [Anonymous User Support](#10-anonymous-user-support)
11. [Post-Generation Reconciliation](#11-post-generation-reconciliation)
12. [Scheduled Tasks](#12-scheduled-tasks)
13. [File Manifest](#13-file-manifest)
14. [Verification & Testing](#14-verification--testing)

---

# 1. Context & Problem Statement

## Why This Change Is Needed

The platform currently uses a **flat daily article quota** — every article counts as 1 unit regardless of size or complexity. This is fundamentally broken for billing because:

```
  CURRENT SYSTEM (Broken)                    PROPOSED SYSTEM (Fair)
  ========================                    =======================

  500-word article   = 1 unit                 500w + Flux    =  19 credits ($0.18 cost)
  3000-word article  = 1 unit   <-- SAME!     3000w + Flux   =  63 credits ($0.58 cost)
  Flux images        = 1 unit                 3000w + Gemini = 233 credits ($2.36 cost)
  Gemini images      = 1 unit   <-- SAME!

  Cost variance: 13x            Cost tracking: Proportional to actual cost
```

A user generating 3000-word articles with Gemini images costs us **13x more** than a user generating 500-word articles with Flux — but both consume the same "1 unit." We need credits that scale with actual cost.

## Business Goals

```
  +--------------------------------------------------+
  |                TARGET MARGINS                      |
  |                                                    |
  |   Revenue ████████████████████████████████ 100%    |
  |   Our Cut ██████████████████████████       80%     |
  |   AI Cost ██████                           20%     |
  |                                                    |
  |   Formula: User Price = 5x Our Cost               |
  |   1 credit = $0.01 cost to us                      |
  |   1 credit = $0.05 charged to user                 |
  |   Margin = ($0.05 - $0.01) / $0.05 = 80%          |
  +--------------------------------------------------+
```

---

# 2. Cost Analysis Deep Dive

## 2.1 AI Model Pricing (from `lib/ai/models.ts`)

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                    TEXT GENERATION MODELS                                │
  ├──────────────────────────┬──────────┬──────────────┬────────────────────┤
  │ Model                    │ Provider │ Input/1k tok │ Output/1k tok      │
  ├──────────────────────────┼──────────┼──────────────┼────────────────────┤
  │ gemini-2.0-flash         │ Gemini   │ $0.0001      │ $0.0004            │
  │ gpt-4o-mini              │ OpenAI   │ $0.00015     │ $0.0006            │
  │ gpt-4o                   │ OpenAI   │ $0.0025      │ $0.01              │
  │ claude-3.5-sonnet        │ Claude   │ $0.003       │ $0.015             │
  │ gemini-3-flash-preview   │ Gemini   │ $0.0005      │ $0.003             │
  │ (image prompt orch.)     │          │              │                    │
  └──────────────────────────┴──────────┴──────────────┴────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                    IMAGE GENERATION MODELS                              │
  ├──────────────────────────┬──────────┬──────────────────────────────────┤
  │ Model                    │ Provider │ Cost Per Image                   │
  ├──────────────────────────┼──────────┼──────────────────────────────────┤
  │ flux-dev                 │ fal.ai   │ $0.025                           │
  │ flux-2                   │ fal.ai   │ $0.060                           │
  │ gemini-3-pro-image       │ Google   │ $0.130  (5.2x more than Flux!)  │
  │ imagen-3                 │ Google   │ $0.040                           │
  └──────────────────────────┴──────────┴──────────────────────────────────┘
```

## 2.2 Generation Pipeline — Every AI Call Per Article

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │               SINGLE ARTICLE GENERATION PIPELINE                    │
  │                                                                     │
  │  PHASE 1: CONTENT (runs in Vercel serverless / SSE streaming)       │
  │  ═══════════════════════════════════════════════════════════════     │
  │                                                                     │
  │  ┌─────────────────────┐                                            │
  │  │ 1. STRUCTURE GEN    │  1 call, gpt-4o (default tier)             │
  │  │    ~2k in / ~500 out│  Cost: ~$0.01                              │
  │  │    H1, H2 outline   │                                            │
  │  └────────┬────────────┘                                            │
  │           │                                                         │
  │  ┌────────▼────────────┐                                            │
  │  │ 2. CONTENT STREAM   │  1 call PER H2, gpt-4o-mini (fast tier)   │
  │  │    ~3k in / ~800 out│  Cost: ~$0.001 per H2                     │
  │  │    Per-section text  │  4 H2s = $0.004, 16 H2s = $0.016         │
  │  └────────┬────────────┘                                            │
  │           │                                                         │
  │  ┌────────▼────────────┐                                            │
  │  │ 3. COMPONENTS GEN   │  1-3 calls, gpt-4o (default tier)         │
  │  │    ~2k in / ~1k out │  Cost: ~$0.015 per call                   │
  │  │    FAQ, unique parts │  2 calls = $0.03                          │
  │  └────────┬────────────┘                                            │
  │           │                                                         │
  │  ┌────────▼────────────┐                                            │
  │  │ 4. GRAMMAR FIX      │  1-2 calls, gpt-4o-mini (fast tier)       │
  │  │    ~2k in / ~500 out│  Cost: ~$0.0006 per call                  │
  │  │    Corrections batch │                                           │
  │  └────────┬────────────┘                                            │
  │           │                                                         │
  │           ▼                                                         │
  │  TEXT TOTAL: $0.04 (500w) to $0.12 (3000w)                         │
  │                                                                     │
  │  PHASE 2: IMAGES (runs in Trigger.dev background tasks)             │
  │  ═══════════════════════════════════════════════════════════════     │
  │                                                                     │
  │  For EACH image (1 featured + 1 per H2):                           │
  │  ┌─────────────────────┐                                            │
  │  │ A. PROMPT ORCH      │  1 call, gemini-3-flash-preview            │
  │  │    ~1k in / ~500 out│  Cost: ~$0.002                             │
  │  │    Simple → detailed│                                            │
  │  └────────┬────────────┘                                            │
  │           │                                                         │
  │  ┌────────▼────────────┐                                            │
  │  │ B. IMAGE GENERATION │  1 image via Flux OR Gemini                │
  │  │                     │  Flux:   $0.025/img                        │
  │  │                     │  Gemini: $0.130/img                        │
  │  └────────┬────────────┘                                            │
  │           │                                                         │
  │  ┌────────▼────────────┐                                            │
  │  │ C. ALT TEXT VALID   │  1 call, gpt-4o-mini (fast tier)           │
  │  │    ~500 in / ~200   │  Cost: ~$0.0002                            │
  │  └────────┬────────────┘                                            │
  │           │                                                         │
  │           ▼                                                         │
  │  PER-IMAGE TOTAL:                                                   │
  │    Flux:   $0.002 + $0.025 + $0.0002 = ~$0.027                     │
  │    Gemini: $0.002 + $0.130 + $0.0002 = ~$0.132                     │
  │                                                                     │
  │  PHASE 3: FINALIZATION                                              │
  │  ═══════════════════════════════════════════════════════════════     │
  │                                                                     │
  │  ┌─────────────────────┐                                            │
  │  │ D. ALT TEXT CORRECT │  1 call total, gemini (fast)               │
  │  │    Final HTML check │  Cost: ~$0.001                             │
  │  └─────────────────────┘                                            │
  │                                                                     │
  │  ┌─────────────────────┐                                            │
  │  │ E. COST AGGREGATION │  DB operations only                        │
  │  │    updateGenCostSum │  Cost: $0                                  │
  │  └─────────────────────┘                                            │
  └─────────────────────────────────────────────────────────────────────┘
```

## 2.3 Article Type Fixed Costs (from `lib/ai/word-counts.ts`)

Each article type has a different amount of "fixed" content (components that always appear regardless of word count target):

```
  FIXED WORD COSTS BY ARTICLE TYPE
  ═════════════════════════════════

  recipe        ████████████████████████████████████████████████  913w  (most expensive)
  review        █████████████████████████████████                 633w
  comparison    ████████████████████████████                      573w
  listicle      ████████████████████                              398w
  how-to        ████████████████████                              398w
  informational ███████████████████                               388w
  commercial    █████████████████                                 353w
  local         ████████████████                                  323w
  affiliate     ██████████                                        208w  (cheapest fixed)

  More fixed content = more component generation calls = higher text cost
  Recipe needs 4-5 extra component calls (ingredients, instructions, tips, nutrition)
  Local only needs 2 extra component calls (why-choose-local, service-info)
```

## 2.4 Image Count Formula

```
  imageCount = 1 (featured image) + h2Count

  h2Count is calculated by word-budget-calculator.ts:
    remainingBudget = targetWordCount - fixedComponentsTotal
    h2Count = floor(remainingBudget / 150)  // 150 words per H2 section
    // Then clamped to article-type-specific min/max

  EXAMPLE: Informational article
  ┌───────────┬──────────┬────────┬────────────┬──────────────────┐
  │ Word Count│ Fixed(w) │ H2s    │ Images     │ Image $ (Flux)   │
  ├───────────┼──────────┼────────┼────────────┼──────────────────┤
  │   500     │   388    │  4*    │  5         │ 5 × $0.027=$0.14 │
  │  1000     │   388    │  4     │  5         │ 5 × $0.027=$0.14 │
  │  1500     │   388    │  7     │  8         │ 8 × $0.027=$0.22 │
  │  2000     │   388    │ 10     │ 11         │11 × $0.027=$0.30 │
  │  2500     │   388    │ 13     │ 14         │14 × $0.027=$0.38 │
  │  3000     │   388    │ 16     │ 17         │17 × $0.027=$0.46 │
  └───────────┴──────────┴────────┴────────────┴──────────────────┘
  * clamped to min of 4 for informational type
```

## 2.5 Total Cost Per Article — The Full Matrix

```
  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║              TOTAL COST PER ARTICLE (Informational Type)                ║
  ╠═══════════╦══════╦════════╦═══════════════╦════════════════╦════════════╣
  ║ Word Count║ H2s  ║ Images ║ Text Cost     ║ Image Cost     ║ TOTAL     ║
  ╠═══════════╬══════╬════════╬═══════════════╬════════════════╬════════════╣
  ║           ║      ║        ║               ║ FLUX   GEMINI  ║ FLUX  GEM ║
  ║   500     ║  4   ║   5    ║ $0.040        ║ $0.14  $0.66   ║$0.18 $0.70║
  ║  1000     ║  4   ║   5    ║ $0.044        ║ $0.14  $0.66   ║$0.18 $0.70║
  ║  1500     ║  7   ║   8    ║ $0.060        ║ $0.22  $1.06   ║$0.28 $1.12║
  ║  2000     ║ 10   ║  11    ║ $0.080        ║ $0.30  $1.45   ║$0.38 $1.53║
  ║  2500     ║ 13   ║  14    ║ $0.100        ║ $0.38  $1.85   ║$0.48 $1.95║
  ║  3000     ║ 16   ║  17    ║ $0.120        ║ $0.46  $2.24   ║$0.58 $2.36║
  ╚═══════════╩══════╩════════╩═══════════════╩════════════════╩════════════╝

  KEY INSIGHT: Images are 75-85% of total cost. Image provider choice matters enormously.

  Cost composition at 1000w with Flux:
    Text: $0.044  ████                    24%
    Images: $0.14 ████████████████        76%

  Cost composition at 1000w with Gemini:
    Text: $0.044  ██                       6%
    Images: $0.66 ████████████████████████ 94%
```

---

# 3. Credit System Architecture

## 3.1 Credit Unit Definition

```
  ┌──────────────────────────────────────────────────────────┐
  │                 CREDIT UNIT DEFINITION                    │
  │                                                           │
  │   1 CREDIT = $0.01 OF OUR COST                           │
  │                                                           │
  │   User price per credit: $0.05                            │
  │   Our cost per credit:   $0.01                            │
  │   Margin per credit:     $0.04 (80%)                      │
  │                                                           │
  │   Example:                                                │
  │     Article costs us $0.18 → 18 credits                   │
  │     User pays 18 × $0.05 = $0.90                          │
  │     Our profit: $0.90 - $0.18 = $0.72 (80% margin)       │
  └──────────────────────────────────────────────────────────┘
```

## 3.2 Credit Calculation Formula

```typescript
function estimateArticleCredits(params: {
  wordCount: number;
  articleType: string;
  imageProvider: 'flux' | 'gemini';
  skipImages: boolean;
}): number {
  // ── TEXT CREDITS ─────────────────────────────────────────
  // Scales with word count. Each 250 words ≈ $0.01 of text gen cost
  const textCredits = Math.max(4, Math.round(params.wordCount / 250));

  // ── IMAGE CREDITS ────────────────────────────────────────
  // Per-image cost converted to credits
  //   Flux:   $0.027/img → 3 credits (rounded up from 2.7)
  //   Gemini: $0.132/img → 13 credits (rounded from 13.2)
  const imageCount = calculateImageCount(params.articleType, params.wordCount);
  const creditsPerImage = params.imageProvider === 'gemini' ? 13 : 3;
  const imageCredits = params.skipImages ? 0 : imageCount * creditsPerImage;

  // ── COMPLEXITY ADDER ─────────────────────────────────────
  // Extra component generation calls for complex article types
  const COMPLEXITY: Record<string, number> = {
    affiliate: 0, commercial: 0, 'how-to': 0,
    informational: 0, listicle: 0, local: 0,
    comparison: 1, review: 1, recipe: 2,
  };
  const complexityAdder = COMPLEXITY[params.articleType] ?? 0;

  return textCredits + imageCredits + complexityAdder;
}
```

## 3.3 Complete Credit Pricing Tables

```
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║                WITH FLUX IMAGES (Default)                              ║
  ╠═══════════╦════════╦══════════╦══════════════╦═══════════╦═════════════╣
  ║ WordCount ║ Images ║ Text Cr. ║ Image Cr.    ║ TOTAL CR. ║ User Pays   ║
  ╠═══════════╬════════╬══════════╬══════════════╬═══════════╬═════════════╣
  ║   500     ║   5    ║    4     ║  15 (5x3)    ║    19     ║   $0.95     ║
  ║  1000     ║   5    ║    4     ║  15 (5x3)    ║    19     ║   $0.95     ║
  ║  1500     ║   8    ║    6     ║  24 (8x3)    ║    30     ║   $1.50     ║
  ║  2000     ║  11    ║    8     ║  33 (11x3)   ║    41     ║   $2.05     ║
  ║  2500     ║  14    ║   10     ║  42 (14x3)   ║    52     ║   $2.60     ║
  ║  3000     ║  17    ║   12     ║  51 (17x3)   ║    63     ║   $3.15     ║
  ╚═══════════╩════════╩══════════╩══════════════╩═══════════╩═════════════╝

  ╔══════════════════════════════════════════════════════════════════════════╗
  ║                WITH GEMINI IMAGES                                      ║
  ╠═══════════╦════════╦══════════╦══════════════╦═══════════╦═════════════╣
  ║ WordCount ║ Images ║ Text Cr. ║ Image Cr.    ║ TOTAL CR. ║ User Pays   ║
  ╠═══════════╬════════╬══════════╬══════════════╬═══════════╬═════════════╣
  ║   500     ║   5    ║    4     ║  65 (5x13)   ║    69     ║   $3.45     ║
  ║  1000     ║   5    ║    4     ║  65 (5x13)   ║    69     ║   $3.45     ║
  ║  1500     ║   8    ║    6     ║ 104 (8x13)   ║   110     ║   $5.50     ║
  ║  2000     ║  11    ║    8     ║ 143 (11x13)  ║   151     ║   $7.55     ║
  ║  2500     ║  14    ║   10     ║ 182 (14x13)  ║   192     ║   $9.60     ║
  ║  3000     ║  17    ║   12     ║ 221 (17x13)  ║   233     ║  $11.65     ║
  ╚═══════════╩════════╩══════════╩══════════════╩═══════════╩═════════════╝

  ╔══════════════════════════════════════════════════════════════════════════╗
  ║                TEXT ONLY (No Images)                                    ║
  ╠═══════════╦═══════════╦═════════════════════════════════════════════════╣
  ║ WordCount ║ TOTAL CR. ║ User Pays                                      ║
  ╠═══════════╬═══════════╬═════════════════════════════════════════════════╣
  ║   500     ║    4      ║ $0.20                                           ║
  ║  1000     ║    4      ║ $0.20                                           ║
  ║  1500     ║    6      ║ $0.30                                           ║
  ║  2000     ║    8      ║ $0.40                                           ║
  ║  2500     ║   10      ║ $0.50                                           ║
  ║  3000     ║   12      ║ $0.60                                           ║
  ╚═══════════╩═══════════╩═════════════════════════════════════════════════╝
```

### 3.4 Complexity Adder by Article Type

```
  Article Type   │ Adder │ Reason
  ───────────────┼───────┼─────────────────────────────────────────────
  affiliate      │   0   │ Standard product card generation
  commercial     │   0   │ Feature list + CTA are small
  how-to         │   0   │ Steps are standard H2 paragraphs
  informational  │   0   │ Key takeaways + quick facts are small
  listicle       │   0   │ Honorable mentions is 1 extra call
  local          │   0   │ Small unique components
  comparison     │  +1   │ 3 extra calls: 2 topic-overview + comparison table
  review         │  +1   │ 3 extra calls: features + pros-cons + rating
  recipe         │  +2   │ 4-5 extra calls: ingredients + instructions + tips + nutrition
```

---

# 4. Tier Design & Pricing

## 4.1 Three Tiers Overview

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │    FREE                  PRO                    PAY-AS-YOU-GO           │
  │    ════                  ═══                    ═════════════           │
  │                                                                         │
  │    $0/mo                 $99/mo                 Variable                │
  │                                                                         │
  │    3 credits/day         2,000 credits/mo       Buy credit packs       │
  │    (~90/mo)              (~105 articles*)       Never expire           │
  │                                                                         │
  │    No signup needed      $0.0495/credit         $0.05/credit           │
  │    (anonymous OK)        (slight discount!)     (standard rate)        │
  │                                                                         │
  │    No bulk gen           Overage: $0.06/cr      No monthly fee         │
  │    No Gemini images      Bulk gen included      Bulk gen included      │
  │    Max 1000 words        All features           All features           │
  │                                                                         │
  │    * at 1000w/Flux                                                     │
  └─────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Margin Analysis Per Tier

```
  ╔═══════════════╦══════════╦═══════════╦══════════════╦════════════════╗
  ║ Tier          ║ Revenue  ║ Our Cost  ║ Profit       ║ Gross Margin   ║
  ╠═══════════════╬══════════╬═══════════╬══════════════╬════════════════╣
  ║ Free          ║ $0/mo    ║ ~$0.90/mo ║ -$0.90       ║ N/A (acquis.)  ║
  ║ Pro           ║ $99/mo   ║ $20/mo    ║ $79/mo       ║ 79.8%          ║
  ║ Pro Overage   ║ Variable ║ $0.01/cr  ║ $0.05/cr     ║ 83.3%          ║
  ║ PAYG          ║ Variable ║ $0.01/cr  ║ $0.04/cr     ║ 80.0%          ║
  ╚═══════════════╩══════════╩═══════════╩══════════════╩════════════════╝
```

## 4.3 Pro Tier Value Proposition

```
  PRO vs PAYG comparison for a user generating 100 articles/month at 1000w Flux:

  Credits needed: 100 articles x 19 credits = 1,900 credits

  PAYG cost:  1,900 x $0.05 = $95.00/mo
  Pro cost:   $99.00/mo (2,000 credits included)
              Leftover: 100 credits for next month's headroom

  The Pro plan makes sense when you use 1,980+ credits/month.
  At exactly 2,000 credits, Pro saves $1.00 vs PAYG (slight discount).
  The real value: convenience + no per-transaction purchases + overage safety net.
```

## 4.4 PAYG Credit Packs

```
  ┌─────────────────────────────────────────────────────────┐
  │              CREDIT PACKS (One-Time Purchase)            │
  ├──────────────┬──────────┬────────────┬──────────────────┤
  │ Pack         │ Credits  │ Price      │ $/Article (1kw)  │
  ├──────────────┼──────────┼────────────┼──────────────────┤
  │ Starter      │ 100      │ $5         │ ~$0.95           │
  │ Basic        │ 500      │ $25        │ ~$0.95           │
  │ Power        │ 1,000    │ $50        │ ~$0.95           │
  │ Agency       │ 5,000    │ $250       │ ~$0.95           │
  └──────────────┴──────────┴────────────┴──────────────────┘

  All packs: $0.05/credit, never expire
```

## 4.5 Free Tier Restrictions

```
  ┌────────────────────────────────────────────────────────────────┐
  │                    FREE TIER LIMITATIONS                       │
  ├────────────────────────┬──────────────────────────────────────┤
  │ Daily credit limit     │ 3 credits/day (resets midnight UTC)  │
  │ Bulk generation        │ NOT available                        │
  │ Image provider         │ Flux only (no Gemini option)         │
  │ Max word count         │ 1,000 words                          │
  │ Article types          │ All 9 types available                │
  │ Cluster mode           │ NOT available                        │
  │ Account required?      │ NO - anonymous users allowed         │
  │ WordPress export       │ NOT available                        │
  │ Article history        │ Last 5 articles only (anon)          │
  └────────────────────────┴──────────────────────────────────────┘

  With 3 credits/day and 19 credits for a 1000w Flux article:
  A free user needs ~7 days to generate ONE full article.
  This is intentional - enough to see quality, not enough for production.
```

## 4.6 Pro Tier Overage System

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │                    PRO OVERAGE FLOW                                  │
  │                                                                      │
  │  Credits Used    Action                                              │
  │  ────────────    ──────                                              │
  │  0-1,600         Normal usage (from monthly allocation)              │
  │  1,600           Warning: "80% of monthly credits used"              │
  │  2,000           Warning: "Monthly credits depleted"                 │
  │                  -> Falls through to PAYG balance (if any)           │
  │                  -> Then falls through to overage billing            │
  │  2,000+          Overage at $0.06/credit (auto-charged)             │
  │                  User can set hard cap (e.g., $50 max overage)       │
  │  Cap reached     "Overage cap reached - purchase credits or wait"   │
  └──────────────────────────────────────────────────────────────────────┘
```

---

# 5. Database Schema

## 5.1 New Tables (added to `lib/db/schema.ts`)

### Table: `credit_balances`

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                     credit_balances                             │
  ├─────────────────────────┬──────────┬───────────────────────────┤
  │ Column                  │ Type     │ Description               │
  ├─────────────────────────┼──────────┼───────────────────────────┤
  │ id                      │ TEXT PK  │ UUID                      │
  │ user_id                 │ TEXT     │ FK -> users.id (unique)   │
  │ tier                    │ TEXT     │ 'free'|'pro'|'payg'       │
  │ monthly_credits         │ INTEGER  │ Total monthly allocation  │
  │ monthly_used            │ INTEGER  │ Credits used this period  │
  │ billing_period_start    │ TIMESTAMP│ Start of current period   │
  │ billing_period_end      │ TIMESTAMP│ End of current period     │
  │ payg_balance            │ INTEGER  │ Purchased credits (never  │
  │                         │          │ expire)                   │
  │ daily_credits           │ INTEGER  │ Free tier daily limit (3) │
  │ daily_used              │ INTEGER  │ Credits used today        │
  │ daily_reset_date        │ TEXT     │ 'YYYY-MM-DD' of last     │
  │                         │          │ reset                     │
  │ overage_credits_used    │ INTEGER  │ Overage this billing prd  │
  │ overage_cap             │ INTEGER  │ null=unlimited, else max  │
  │ stripe_customer_id      │ TEXT     │ Stripe customer ID        │
  │ stripe_subscription_id  │ TEXT     │ Stripe subscription ID    │
  │ created_at              │ TIMESTAMP│ Record creation           │
  │ updated_at              │ TIMESTAMP│ Last update               │
  └─────────────────────────┴──────────┴───────────────────────────┘
```

### Table: `credit_transactions`

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                     credit_transactions                        │
  ├─────────────────────────┬──────────┬───────────────────────────┤
  │ Column                  │ Type     │ Description               │
  ├─────────────────────────┼──────────┼───────────────────────────┤
  │ id                      │ TEXT PK  │ UUID                      │
  │ user_id                 │ TEXT     │ FK -> users.id            │
  │ type                    │ TEXT     │ 'debit'|'credit'|'refund' │
  │                         │          │ |'purchase'|'monthly_     │
  │                         │          │ reset'|'overage'          │
  │ amount                  │ INTEGER  │ + for adds, - for deducts │
  │ balance_before          │ INTEGER  │ Total available before    │
  │ balance_after           │ INTEGER  │ Total available after     │
  │ source                  │ TEXT     │ 'monthly_allocation'|     │
  │                         │          │ 'payg_purchase'|          │
  │                         │          │ 'article_generation'|     │
  │                         │          │ 'refund'|'overage'|       │
  │                         │          │ 'daily_allocation'        │
  │ reference_id            │ TEXT     │ historyId / bulkJobId /   │
  │                         │          │ stripe paymentId          │
  │ metadata                │ TEXT     │ JSON: { wordCount,        │
  │                         │          │ imageCount, imageProvider, │
  │                         │          │ articleType, estimated,   │
  │                         │          │ reconciled }              │
  │ created_at              │ TIMESTAMP│ Transaction timestamp     │
  └─────────────────────────┴──────────┴───────────────────────────┘
```

### Table: `anonymous_usage`

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                     anonymous_usage                             │
  ├─────────────────────────┬──────────┬───────────────────────────┤
  │ Column                  │ Type     │ Description               │
  ├─────────────────────────┼──────────┼───────────────────────────┤
  │ id                      │ TEXT PK  │ UUID                      │
  │ fingerprint             │ TEXT     │ Browser fingerprint hash  │
  │ ip_address              │ TEXT     │ Client IP address         │
  │ daily_used              │ INTEGER  │ Credits used today        │
  │ daily_reset_date        │ TEXT     │ 'YYYY-MM-DD'             │
  │ created_at              │ TIMESTAMP│ First seen                │
  │ updated_at              │ TIMESTAMP│ Last activity             │
  └─────────────────────────┴──────────┴───────────────────────────┘

  Index: UNIQUE(fingerprint, ip_address) for dedup
```

---

# 6. Service Layer

## 6.1 Credit Estimator (`lib/services/credit-estimator.ts`) — NEW FILE

```
  PURPOSE: Calculate how many credits an article will cost BEFORE generation starts.

  DEPENDS ON (reuses existing code):
  ├── lib/services/word-budget-calculator.ts  ->  calculateWordBudget()
  ├── lib/ai/word-counts.ts                  ->  H2_COUNT_LIMITS, FIXED_COSTS_BY_ARTICLE_TYPE
  └── lib/ai/models.ts                       ->  IMAGE_PRICING (for provider cost lookup)

  EXPORTS:
  ├── estimateArticleCredits(params) -> number
  ├── calculateImageCount(articleType, wordCount) -> number
  ├── CREDITS_PER_FLUX_IMAGE = 3
  ├── CREDITS_PER_GEMINI_IMAGE = 13
  └── ARTICLE_TYPE_COMPLEXITY: Record<string, number>
```

## 6.2 Credit Service (`lib/services/credit-service.ts`) — NEW FILE

```
  PURPOSE: All credit balance operations. Replaces quota-service.ts for credit logic.

  DEPENDS ON:
  ├── lib/db/schema.ts           ->  creditBalances, creditTransactions, anonymousUsage
  ├── lib/db/index.ts            ->  db instance
  └── lib/services/credit-estimator.ts

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                    CREDIT DEDUCTION ORDER                               │
  │                                                                         │
  │  When a user spends credits, deduct in this priority:                   │
  │                                                                         │
  │  ┌───────────────────────┐                                              │
  │  │ 1. Daily Allocation   │  Free tier: 3/day (these expire at midnight) │
  │  │    (Free tier only)   │                                              │
  │  └──────────┬────────────┘                                              │
  │             │ exhausted?                                                 │
  │             ▼                                                            │
  │  ┌───────────────────────┐                                              │
  │  │ 2. Monthly Allocation │  Pro tier: 2,000/month (expire at period end)│
  │  │    (Pro tier only)    │                                              │
  │  └──────────┬────────────┘                                              │
  │             │ exhausted?                                                 │
  │             ▼                                                            │
  │  ┌───────────────────────┐                                              │
  │  │ 3. PAYG Balance       │  Purchased credits (never expire)            │
  │  │    (Any tier)         │  Use last to preserve user's investment      │
  │  └──────────┬────────────┘                                              │
  │             │ exhausted?                                                 │
  │             ▼                                                            │
  │  ┌───────────────────────┐                                              │
  │  │ 4. Overage            │  Pro tier only, at $0.06/credit              │
  │  │    (Pro tier only)    │  Respects overageCap if set                  │
  │  └──────────┬────────────┘                                              │
  │             │ exhausted or at cap?                                       │
  │             ▼                                                            │
  │  ┌───────────────────────┐                                              │
  │  │ InsufficientCredits   │  Throw error -> 402 Payment Required         │
  │  │ Error                 │                                              │
  │  └───────────────────────┘                                              │
  └──────────────────────────────────────────────────────────────────────────┘

  EXPORTS:
  ├── getCreditInfo(userId) -> CreditInfo
  ├── getAnonymousCreditInfo(fingerprint, ip) -> CreditInfo
  ├── hasCreditsAvailable(userId | anonymous, amount) -> boolean
  ├── reserveCredits(userId, amount, referenceId) -> void
  ├── deductCredits(userId, amount, referenceId, metadata) -> void
  ├── refundCredits(userId, amount, referenceId) -> void
  ├── addPurchasedCredits(userId, amount, paymentId) -> void
  ├── resetMonthlyCredits(userId) -> void
  ├── resetDailyCredits(userId | fingerprint) -> void
  ├── upgradeTier(userId, tier, stripeSubscriptionId?) -> void
  ├── downgradeTier(userId) -> void
  ├── InsufficientCreditsError (class, like existing QuotaExceededError)
  └── CreditInfo (interface)

  INTERFACE CreditInfo:
  {
    tier: 'free' | 'pro' | 'payg';
    available: number;              // total credits user can spend now
    daily?: { used, limit, resetsAt };         // Free tier
    monthly?: { used, limit, resetsAt };       // Pro tier
    paygBalance: number;
    overage?: { used, cap, costSoFar };        // Pro tier
    isAnonymous: boolean;
  }
```

## 6.3 Existing Quota Service — Backward Compatibility

```
  lib/services/quota-service.ts

  DO NOT DELETE - keep existing functions working during migration.
  Add a wrapper that delegates to credit-service.ts:

  incrementQuotaUsage(userId) -> calls deductCredits(userId, estimatedCredits, ...)
  getQuotaInfo(userId) -> calls getCreditInfo(userId) and maps to old format
  reserveQuota(userId, amount) -> calls reserveCredits(userId, totalCredits, ...)
  releaseQuota(userId, amount) -> calls refundCredits(userId, creditAmount, ...)

  This ensures nothing breaks while we migrate route by route.
```

---

# 7. API Routes

## 7.1 Modified Routes

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Route                          │ Change                               │
  ├────────────────────────────────┼──────────────────────────────────────┤
  │ app/api/generate/trigger/      │ Replace incrementQuotaUsage with     │
  │ route.ts                       │ estimateArticleCredits + reserve     │
  │                                │ Credits. Return credit cost in resp. │
  ├────────────────────────────────┼──────────────────────────────────────┤
  │ app/api/generate/route.ts      │ Same as above for streaming route   │
  ├────────────────────────────────┼──────────────────────────────────────┤
  │ app/api/bulk/start/route.ts    │ Replace reserveQuota(userId, count) │
  │                                │ with sum of estimateArticleCredits  │
  │                                │ for each article + reserveCredits   │
  ├────────────────────────────────┼──────────────────────────────────────┤
  │ app/api/quota/route.ts         │ Return CreditInfo instead of old    │
  │                                │ quota format (keep backward compat  │
  │                                │ fields)                             │
  ├────────────────────────────────┼──────────────────────────────────────┤
  │ lib/jobs/orchestrate-          │ Add reconciliation step after       │
  │ generation.ts                  │ updateGenerationCostSummary         │
  ├────────────────────────────────┼──────────────────────────────────────┤
  │ lib/jobs/bulk-generate.ts      │ Add per-article reconciliation      │
  └────────────────────────────────┴──────────────────────────────────────┘
```

## 7.2 New Routes

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │ NEW Route                      │ Purpose                              │
  ├────────────────────────────────┼──────────────────────────────────────┤
  │ app/api/credits/route.ts       │ GET: Credit balance + recent         │
  │                                │ transactions                         │
  ├────────────────────────────────┼──────────────────────────────────────┤
  │ app/api/credits/estimate/      │ POST: Estimate credits for given     │
  │ route.ts                       │ { wordCount, articleType,            │
  │                                │   imageProvider, skipImages }        │
  │                                │ Returns: { credits, userCost }      │
  ├────────────────────────────────┼──────────────────────────────────────┤
  │ app/api/credits/purchase/      │ POST: Create Stripe checkout         │
  │ route.ts                       │ session for credit pack purchase     │
  ├────────────────────────────────┼──────────────────────────────────────┤
  │ app/api/billing/route.ts       │ GET: Current billing info (tier,     │
  │                                │ subscription status, next billing)   │
  ├────────────────────────────────┼──────────────────────────────────────┤
  │ app/api/billing/subscribe/     │ POST: Create Stripe checkout for     │
  │ route.ts                       │ Pro subscription                     │
  ├────────────────────────────────┼──────────────────────────────────────┤
  │ app/api/billing/portal/        │ POST: Create Stripe customer         │
  │ route.ts                       │ portal session URL                   │
  ├────────────────────────────────┼──────────────────────────────────────┤
  │ app/api/webhooks/stripe/       │ POST: Stripe webhook handler         │
  │ route.ts                       │ Events: checkout.session.completed,  │
  │                                │ invoice.paid, subscription.updated,  │
  │                                │ subscription.deleted                 │
  └────────────────────────────────┴──────────────────────────────────────┘
```

---

# 8. Stripe Integration

## 8.1 Architecture

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                      STRIPE PAYMENT FLOWS                               │
  │                                                                         │
  │  ┌─────────────────────────────────────────────────────────────┐        │
  │  │ FLOW 1: Pro Subscription ($99/mo)                           │        │
  │  │                                                             │        │
  │  │  User clicks "Subscribe to Pro"                             │        │
  │  │       │                                                     │        │
  │  │       ▼                                                     │        │
  │  │  POST /api/billing/subscribe                                │        │
  │  │       │  Creates Stripe Checkout Session (subscription mode) │        │
  │  │       ▼                                                     │        │
  │  │  Redirect to Stripe Checkout                                │        │
  │  │       │                                                     │        │
  │  │       ▼                                                     │        │
  │  │  User pays -> Stripe sends webhook                          │        │
  │  │       │                                                     │        │
  │  │       ▼                                                     │        │
  │  │  POST /api/webhooks/stripe                                  │        │
  │  │       │  Event: checkout.session.completed                  │        │
  │  │       │  -> upgradeTier(userId, 'pro', subscriptionId)      │        │
  │  │       │  -> Set monthlyCredits = 2000                       │        │
  │  │       │  -> Set billingPeriodStart/End                      │        │
  │  │       ▼                                                     │        │
  │  │  Each month: invoice.paid webhook                           │        │
  │  │       -> resetMonthlyCredits(userId)                        │        │
  │  │       -> Reset monthlyUsed = 0, overageCreditsUsed = 0      │        │
  │  │                                                             │        │
  │  │  Cancellation: subscription.deleted webhook                 │        │
  │  │       -> downgradeTier(userId) (back to free/payg)          │        │
  │  └─────────────────────────────────────────────────────────────┘        │
  │                                                                         │
  │  ┌─────────────────────────────────────────────────────────────┐        │
  │  │ FLOW 2: PAYG Credit Pack Purchase                           │        │
  │  │                                                             │        │
  │  │  User clicks "Buy 500 Credits for $25"                      │        │
  │  │       │                                                     │        │
  │  │       ▼                                                     │        │
  │  │  POST /api/credits/purchase                                 │        │
  │  │       │  Body: { pack: '500' }                              │        │
  │  │       │  Creates Stripe Checkout Session (payment mode)     │        │
  │  │       ▼                                                     │        │
  │  │  Redirect to Stripe Checkout                                │        │
  │  │       │                                                     │        │
  │  │       ▼                                                     │        │
  │  │  User pays -> Stripe sends webhook                          │        │
  │  │       │                                                     │        │
  │  │       ▼                                                     │        │
  │  │  POST /api/webhooks/stripe                                  │        │
  │  │       │  Event: checkout.session.completed                  │        │
  │  │       │  -> addPurchasedCredits(userId, 500, paymentId)     │        │
  │  │       │  -> paygBalance += 500                              │        │
  │  │       │  -> Log credit_transaction                          │        │
  │  └─────────────────────────────────────────────────────────────┘        │
  │                                                                         │
  │  ┌─────────────────────────────────────────────────────────────┐        │
  │  │ FLOW 3: Pro Overage Billing                                 │        │
  │  │                                                             │        │
  │  │  NOT auto-charged per transaction.                          │        │
  │  │  Instead: accumulated and charged at end of billing period  │        │
  │  │  via Stripe Invoice.                                        │        │
  │  │                                                             │        │
  │  │  End of billing period:                                     │        │
  │  │       -> overageCreditsUsed x $0.06 = overage charge        │        │
  │  │       -> Add as line item to next Stripe invoice            │        │
  │  │       -> Or: Create one-off invoice for overage amount      │        │
  │  └─────────────────────────────────────────────────────────────┘        │
  └──────────────────────────────────────────────────────────────────────────┘
```

## 8.2 Stripe Service (`lib/services/stripe-service.ts`) — NEW FILE

```
  PURPOSE: All Stripe API interactions.

  NEW DEPENDENCY: npm install stripe

  ENV VARS NEEDED:
  ├── STRIPE_SECRET_KEY          ->  sk_live_... or sk_test_...
  ├── STRIPE_WEBHOOK_SECRET      ->  whsec_...
  ├── STRIPE_PRO_PRICE_ID        ->  price_... (for $99/mo subscription)
  ├── STRIPE_PACK_100_PRICE_ID   ->  price_... (for $5 / 100 credits)
  ├── STRIPE_PACK_500_PRICE_ID   ->  price_... (for $25 / 500 credits)
  ├── STRIPE_PACK_1000_PRICE_ID  ->  price_... (for $50 / 1000 credits)
  ├── STRIPE_PACK_5000_PRICE_ID  ->  price_... (for $250 / 5000 credits)
  └── NEXT_PUBLIC_APP_URL        ->  https://yourapp.com (for redirect URLs)

  EXPORTS:
  ├── createOrGetCustomer(userId, email) -> stripeCustomerId
  ├── createProSubscriptionCheckout(userId) -> checkoutUrl
  ├── createCreditPackCheckout(userId, packSize) -> checkoutUrl
  ├── createCustomerPortalSession(userId) -> portalUrl
  ├── handleWebhookEvent(event) -> void
  ├── getSubscriptionStatus(subscriptionId) -> status
  └── cancelSubscription(subscriptionId) -> void
```

## 8.3 Stripe Products to Create (in Stripe Dashboard)

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │ Product: "SEO Content AI - Pro Plan"                                │
  │ Price:   $99.00/month (recurring)                                   │
  │ ID:      Set as STRIPE_PRO_PRICE_ID                                 │
  ├──────────────────────────────────────────────────────────────────────┤
  │ Product: "SEO Content AI - 100 Credits"                             │
  │ Price:   $5.00 (one-time)                                           │
  │ ID:      Set as STRIPE_PACK_100_PRICE_ID                            │
  ├──────────────────────────────────────────────────────────────────────┤
  │ Product: "SEO Content AI - 500 Credits"                             │
  │ Price:   $25.00 (one-time)                                          │
  │ ID:      Set as STRIPE_PACK_500_PRICE_ID                            │
  ├──────────────────────────────────────────────────────────────────────┤
  │ Product: "SEO Content AI - 1,000 Credits"                           │
  │ Price:   $50.00 (one-time)                                          │
  │ ID:      Set as STRIPE_PACK_1000_PRICE_ID                           │
  ├──────────────────────────────────────────────────────────────────────┤
  │ Product: "SEO Content AI - 5,000 Credits"                           │
  │ Price:   $250.00 (one-time)                                         │
  │ ID:      Set as STRIPE_PACK_5000_PRICE_ID                           │
  └──────────────────────────────────────────────────────────────────────┘
```

---

# 9. Frontend Changes

## 9.1 Generation Form — Credit Estimate Display

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  BEFORE (current UI)              AFTER (new UI)                    │
  │  ════════════════════             ══════════════                     │
  │                                                                     │
  │  [Generate Article]               Estimated Cost: 19 credits        │
  │                                   = $0.95                           │
  │                                   Your Balance: 1,847 credits       │
  │                                                                     │
  │                                   [Generate Article - 19 credits]   │
  │                                                                     │
  │  The estimate updates live as     If insufficient credits:          │
  │  user changes word count,         [Buy Credits] or [Upgrade to Pro] │
  │  article type, or image provider                                    │
  └──────────────────────────────────────────────────────────────────────┘

  IMPLEMENTATION:
  - Compute client-side using the same estimateArticleCredits formula
    (preferred - no API call needed, formula is deterministic)
  - Show credit cost prominently on the Generate button
```

## 9.2 Header/Sidebar Credit Balance

```
  ┌──────────────────────────────────────────────────┐
  │  CURRENT                    NEW                   │
  │  ═══════                    ═══                   │
  │                                                   │
  │  Quota: 7/10 today          Credits: 1,847        │
  │                              Pro Plan              │
  │                              ▼ Details             │
  │                                                   │
  │                              Expanded:             │
  │                              Monthly: 153/2,000    │
  │                              PAYG: 1,694           │
  │                              Resets: Feb 28        │
  └──────────────────────────────────────────────────┘
```

## 9.3 New Pages/Components

```
  NEW FILES:
  ├── app/billing/page.tsx                    ->  Billing dashboard page
  │   ├── Current plan display
  │   ├── Credit balance (monthly + PAYG + overage)
  │   ├── Usage chart (last 30 days)
  │   ├── Transaction history table
  │   ├── [Upgrade to Pro] / [Manage Subscription] button
  │   └── [Buy Credits] section with pack options
  │
  ├── components/billing/credit-estimate.tsx  ->  Live cost estimate in gen form
  ├── components/billing/credit-balance.tsx   ->  Header balance indicator
  ├── components/billing/upgrade-modal.tsx    ->  Shown when credits insufficient
  ├── components/billing/purchase-credits.tsx ->  Credit pack selection cards
  └── components/billing/transaction-table.tsx->  Paginated transaction history
```

---

# 10. Anonymous User Support

## 10.1 How It Works

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                  ANONYMOUS USER FLOW                                    │
  │                                                                         │
  │  First Visit (no account):                                              │
  │  ┌─────────────────────────┐                                            │
  │  │ Generate fingerprint    │  Hash of: userAgent + screen res +         │
  │  │ on client side          │  timezone + language + platform             │
  │  │ (lightweight, no lib)   │  Stored in localStorage as fallback        │
  │  └────────┬────────────────┘                                            │
  │           │                                                             │
  │           ▼                                                             │
  │  ┌─────────────────────────┐                                            │
  │  │ Send fingerprint +      │  Included in X-Fingerprint header          │
  │  │ IP with API requests    │  IP extracted server-side                  │
  │  └────────┬────────────────┘                                            │
  │           │                                                             │
  │           ▼                                                             │
  │  ┌─────────────────────────┐                                            │
  │  │ Server checks           │  Look up anonymous_usage by                │
  │  │ anonymous_usage table   │  (fingerprint, ip_address)                 │
  │  └────────┬────────────────┘                                            │
  │           │                                                             │
  │       ┌───┴────┐                                                        │
  │       │ Found? │                                                        │
  │       └───┬────┘                                                        │
  │      NO   │   YES                                                       │
  │       │   │   │                                                         │
  │       ▼   │   ▼                                                         │
  │  Create   │  Check dailyUsed < 3                                        │
  │  new row  │  and dailyResetDate == today                                │
  │  dailyUsed│  (reset if different day)                                   │
  │  = 0      │                                                             │
  │           │                                                             │
  │           ▼                                                             │
  │  Proceed with generation if credits available                           │
  │                                                                         │
  │  RESTRICTIONS FOR ANONYMOUS:                                            │
  │  - 3 credits/day only                                                   │
  │  - Flux images only                                                     │
  │  - Max 1000 words                                                       │
  │  - No bulk generation                                                   │
  │  - No Gemini images                                                     │
  │  - Article history: last 5 only (stored in localStorage)                │
  │  - Prompt to sign up after each generation                              │
  └──────────────────────────────────────────────────────────────────────────┘
```

## 10.2 Account Migration

When an anonymous user creates an account:
- Any remaining daily credits carry over to their new free-tier balance
- Anonymous usage history is NOT migrated (localStorage-only articles)
- A fresh `credit_balances` row is created with tier='free'

---

# 11. Post-Generation Reconciliation

## 11.1 Why Reconciliation Is Needed

```
  BEFORE GENERATION:                    AFTER GENERATION:
  ══════════════════                    ═════════════════

  Estimated credits: 19                Actual cost: $0.16 = 16 credits
  (based on formula)                   (from generation_cost_summaries)

  We reserved 19 credits               Actual was 16 credits
  from user's balance
                                       REFUND 3 credits back to user!

  WHY THE DIFFERENCE?
  - Token counts are estimates (actual may be fewer)
  - Some H2 sections may generate shorter
  - Image retries may not all succeed
  - Grammar correction may be skipped
  - Provider fallback may use cheaper model
```

## 11.2 Reconciliation Flow

```
  Added to orchestrate-generation.ts and bulk-generate.ts:

  ┌──────────────────────────────────────────────────────────────────────┐
  │  // After updateGenerationCostSummary(historyId, userId):           │
  │                                                                     │
  │  Step 1: Read actual cost                                           │
  │    const summary = await getGenerationCost(historyId);              │
  │    const actualCostMicro = summary.totalCostMicro;                  │
  │                                                                     │
  │  Step 2: Convert to credits (round UP to nearest credit)            │
  │    const actualCredits = Math.ceil(actualCostMicro / 10000);        │
  │    // 10000 micro-dollars = $0.01 = 1 credit                       │
  │                                                                     │
  │  Step 3: Compare with reserved amount                               │
  │    const reserved = getReservedCredits(historyId);                  │
  │    const difference = reserved - actualCredits;                     │
  │                                                                     │
  │  Step 4: Reconcile                                                  │
  │    if (difference > 0) {                                            │
  │      await refundCredits(userId, difference, historyId);            │
  │      // Log: "Refunded 3 credits (estimated 19, actual 16)"        │
  │    } else if (difference < 0) {                                     │
  │      // Rare: actual > estimated (retries, fallback to expensive)   │
  │      // Absorb the difference - don't charge user extra after       │
  │      // generation. Log it for monitoring.                          │
  │      logger.warn("Actual cost exceeded estimate", {                 │
  │        estimated: reserved, actual: actualCredits,                  │
  │        overageAbsorbed: Math.abs(difference)                        │
  │      });                                                            │
  │    }                                                                │
  └──────────────────────────────────────────────────────────────────────┘
```

---

# 12. Scheduled Tasks

## 12.1 Monthly Credit Reset (Trigger.dev Cron)

```
  NEW FILE: lib/jobs/monthly-credit-reset.ts

  ┌──────────────────────────────────────────────────────────────────────┐
  │  import { schedules } from "@trigger.dev/sdk";                      │
  │                                                                     │
  │  // Runs daily at midnight UTC                                      │
  │  // Checks which Pro users have billing periods that ended today    │
  │  // Resets their monthlyUsed and overageCreditsUsed to 0            │
  │                                                                     │
  │  schedules.task({                                                   │
  │    id: "monthly-credit-reset",                                      │
  │    cron: "0 0 * * *",  // Every day at midnight UTC                 │
  │    run: async () => {                                               │
  │      // Find Pro users whose billingPeriodEnd <= now                │
  │      // For each: reset monthlyUsed=0, overageCreditsUsed=0         │
  │      //   Set new billingPeriodStart=now, billingPeriodEnd=+1month  │
  │      //   Log credit_transaction type='monthly_reset'               │
  │    },                                                               │
  │  });                                                                │
  └──────────────────────────────────────────────────────────────────────┘

  NOTE: The actual Stripe invoice.paid webhook also triggers a reset,
  so this cron is a safety net for edge cases (webhook missed, etc.)
```

---

# 13. File Manifest

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                        COMPLETE FILE MANIFEST                           │
  │                                                                         │
  │  ★ = New File    ✎ = Modified File                                     │
  │                                                                         │
  │  SCHEMA & MIGRATIONS                                                    │
  │  ├── ✎ lib/db/schema.ts                      Add 3 new tables          │
  │  └── ★ drizzle/XXXX_add_credit_tables.sql    Auto-generated migration  │
  │                                                                         │
  │  SERVICES                                                               │
  │  ├── ★ lib/services/credit-estimator.ts       Credit calculation formula │
  │  ├── ★ lib/services/credit-service.ts         Core credit operations    │
  │  ├── ★ lib/services/stripe-service.ts         Stripe API interactions   │
  │  └── ✎ lib/services/quota-service.ts          Wrap with credit delegates│
  │                                                                         │
  │  API ROUTES (Modified)                                                  │
  │  ├── ✎ app/api/generate/trigger/route.ts      Credit-based enforcement  │
  │  ├── ✎ app/api/generate/route.ts              Credit-based enforcement  │
  │  ├── ✎ app/api/bulk/start/route.ts            Credit-based enforcement  │
  │  └── ✎ app/api/quota/route.ts                 Return CreditInfo        │
  │                                                                         │
  │  API ROUTES (New)                                                       │
  │  ├── ★ app/api/credits/route.ts               GET balance + history     │
  │  ├── ★ app/api/credits/estimate/route.ts      POST estimate credits     │
  │  ├── ★ app/api/credits/purchase/route.ts      POST buy credit pack      │
  │  ├── ★ app/api/billing/route.ts               GET billing info          │
  │  ├── ★ app/api/billing/subscribe/route.ts     POST Pro subscription     │
  │  ├── ★ app/api/billing/portal/route.ts        POST Stripe portal        │
  │  └── ★ app/api/webhooks/stripe/route.ts       POST Stripe webhooks      │
  │                                                                         │
  │  TRIGGER.DEV TASKS                                                      │
  │  ├── ✎ lib/jobs/orchestrate-generation.ts     Add reconciliation        │
  │  ├── ✎ lib/jobs/bulk-generate.ts              Add reconciliation        │
  │  └── ★ lib/jobs/monthly-credit-reset.ts       Cron: monthly reset       │
  │                                                                         │
  │  FRONTEND                                                               │
  │  ├── ★ app/billing/page.tsx                   Billing dashboard         │
  │  ├── ★ components/billing/credit-estimate.tsx Live cost in gen form     │
  │  ├── ★ components/billing/credit-balance.tsx  Header balance display    │
  │  ├── ★ components/billing/upgrade-modal.tsx   Insufficient credits      │
  │  ├── ★ components/billing/purchase-credits.tsx Pack selection cards     │
  │  ├── ★ components/billing/transaction-table.tsx History table           │
  │  └── ✎ (existing gen form components)         Add credit estimate UI    │
  │                                                                         │
  │  CONFIG                                                                 │
  │  └── ✎ .env.local                            Add Stripe env vars       │
  │                                                                         │
  │  DEPENDENCIES                                                           │
  │  └── ✎ package.json                          Add: stripe               │
  └──────────────────────────────────────────────────────────────────────────┘
```

---

# 14. Verification & Testing

## 14.1 Unit Tests

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │ TEST: Credit Estimator                                              │
  │                                                                     │
  │ For each of the 9 article types, at word counts 500/1000/2000/3000: │
  │   [x] estimateArticleCredits returns expected credits (Flux)        │
  │   [x] estimateArticleCredits returns expected credits (Gemini)      │
  │   [x] estimateArticleCredits returns expected credits (no images)   │
  │   [x] calculateImageCount matches H2 count + 1                     │
  │   [x] Complexity adder applies correctly for comparison/review/     │
  │       recipe                                                        │
  │                                                                     │
  │ TEST: Credit Service                                                │
  │                                                                     │
  │   [x] deductCredits follows correct priority order                  │
  │   [x] Free tier: blocks at 3 credits/day                           │
  │   [x] Pro tier: uses monthly first, then PAYG, then overage        │
  │   [x] Overage cap respected                                        │
  │   [x] InsufficientCreditsError thrown when all sources exhausted    │
  │   [x] reserveCredits + refundCredits balance correctly              │
  │   [x] Daily reset works (date comparison)                          │
  │   [x] Monthly reset works (billing period comparison)               │
  │   [x] Concurrent deductions don't double-spend (DB transaction)     │
  │                                                                     │
  │ TEST: Stripe Service                                                │
  │                                                                     │
  │   [x] Webhook signature verification                                │
  │   [x] checkout.session.completed -> credits added or tier upgraded  │
  │   [x] invoice.paid -> monthly reset triggered                      │
  │   [x] subscription.deleted -> tier downgraded                      │
  └──────────────────────────────────────────────────────────────────────┘
```

## 14.2 Integration Tests

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │ SCENARIO 1: Single Article Generation (Pro User)                    │
  │                                                                     │
  │   1. User has 2,000 monthly credits, 0 used                        │
  │   2. Generate 1000w informational article with Flux                 │
  │   3. BEFORE: 19 credits reserved, balance shows 1,981              │
  │   4. Generation completes, actual cost = 16 credits                 │
  │   5. AFTER: 3 credits refunded, balance shows 1,984                │
  │   6. credit_transactions has 2 rows: debit(-19) + refund(+3)       │
  │                                                                     │
  │ SCENARIO 2: Bulk Generation (50 articles)                           │
  │                                                                     │
  │   1. User has 2,000 monthly credits                                 │
  │   2. Bulk generate 50 x 1000w informational articles with Flux     │
  │   3. Total estimated: 50 x 19 = 950 credits reserved               │
  │   4. After all complete: reconcile each, ~800 actual                │
  │   5. ~150 credits refunded total                                    │
  │                                                                     │
  │ SCENARIO 3: Free Tier Limit                                         │
  │                                                                     │
  │   1. Anonymous user with 3 credits/day                              │
  │   2. Request 1000w article (19 credits) -> BLOCKED (insufficient)   │
  │   3. Request 500w text-only article (4 credits) -> BLOCKED          │
  │   4. Show upgrade prompt                                            │
  │                                                                     │
  │ SCENARIO 4: Pro -> PAYG -> Overage waterfall                        │
  │                                                                     │
  │   1. Pro user: 5 monthly credits left + 10 PAYG credits            │
  │   2. Generate article costing 19 credits                            │
  │   3. Deduction: 5 from monthly + 10 from PAYG + 4 from overage     │
  │   4. credit_transactions shows 3 rows with different sources        │
  │                                                                     │
  │ SCENARIO 5: Stripe Webhook -> Credit Addition                       │
  │                                                                     │
  │   1. Use Stripe CLI: stripe trigger checkout.session.completed      │
  │   2. Verify webhook handler processes correctly                     │
  │   3. Check credit_balances.paygBalance increased                    │
  │   4. Check credit_transactions has purchase record                  │
  └──────────────────────────────────────────────────────────────────────┘
```

## 14.3 Manual E2E Verification Checklist

```
  [ ] Database migration runs cleanly (npx drizzle-kit push)
  [ ] Existing users get credit_balances row on first request
  [ ] Anonymous user can generate with 3 credits/day
  [ ] Anonymous user blocked after 3 credits
  [ ] Signed-in free user gets 3 credits/day
  [ ] Credit estimate shows correctly in generation form
  [ ] Generation deducts correct credits
  [ ] Post-generation reconciliation refunds excess
  [ ] Stripe test checkout for credit pack works
  [ ] Credits appear in balance after Stripe purchase
  [ ] Stripe test checkout for Pro subscription works
  [ ] Pro tier activates with 2,000 monthly credits
  [ ] Pro monthly reset works (via webhook or cron)
  [ ] Pro cancellation downgrades tier
  [ ] Stripe customer portal accessible
  [ ] Billing page shows correct info
  [ ] Bulk generation reserves total credits upfront
  [ ] Transaction history displays correctly
  [ ] Insufficient credits shows upgrade/purchase prompt
```
