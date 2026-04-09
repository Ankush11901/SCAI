# Billing + Usage UI Redesign Plan

## Overview

This plan rebuilds the Subscription and Usage tabs from scratch, fixing redundancy, connecting to the existing backend, and implementing proper paywall flows.

---

## What's Already Built (Backend) ✅

| Component | Status | What It Does |
|-----------|--------|--------------|
| `credit-service.ts` | ✅ | Credit deduction, waterfall (daily→monthly→payg→overage), refunds |
| `/api/billing` | ✅ | Returns: tier, subscription status, next billing, credits |
| `/api/quota` | ✅ | Returns: quota limits, credit breakdown (daily/monthly/payg) |
| `/api/billing/history` | ✅ | Returns: invoices from Stripe, credit transactions |
| `/api/billing/subscribe` | ✅ | Creates Stripe checkout for Pro subscription |
| `/api/billing/portal` | ✅ | Opens Stripe billing portal |
| `/api/credits/purchase` | ✅ | Creates Stripe checkout for add-on credits |
| `/api/generate/route.ts` | ✅ | Returns 402 when credits exhausted |

---

## Implementation Tasks

### Phase 1: Setup & Dependencies

- [x] 1.1 Install recharts for usage graph
- [x] 1.2 Create `/api/usage/history` endpoint for graph data

### Phase 2: Subscription Tab Rebuild

- [x] 2.1 Create `SubscriptionCard` component (compact plan status)
- [x] 2.2 Create `PaymentMethodCard` component (Stripe portal link)
- [x] 2.3 Create `AddOnCreditsCard` component (shows balance, buy more)
- [x] 2.4 Create `InvoiceTable` component (billing history)
- [x] 2.5 Rebuild `BillingTabContent` in settings page with new layout
- [x] 2.6 Mark old billing components as legacy

### Phase 3: Usage Tab Rebuild

- [x] 3.1 Create `UsageGraph` component (recharts AreaChart)
- [x] 3.2 Create `CreditBreakdownCard` component (progress bars)
- [x] 3.3 UpgradeNudge integrated into CreditBreakdownCard (for Free users)
- [x] 3.4 Rebuild `UsageTabContent` in settings page with new layout

### Phase 4: Paywall Modal

- [x] 4.1 Create `CreditExhaustedModal` component
  - [x] Free user variant: "Upgrade to Pro"
  - [x] Pro user variant: "Buy add-on credits" with pack selector
- [x] 4.2 Connect paywall to generate page (catch 402 response)
- [x] 4.3 Wire up actions (upgrade → checkout, buy credits → checkout)

### Phase 5: Testing & Polish

- [ ] 5.1 Test Free user flow (Subscription + Usage + Paywall)
- [ ] 5.2 Test Pro user flow (Subscription + Usage + Paywall)
- [ ] 5.3 Verify Stripe checkout redirects work
- [ ] 5.4 Verify billing portal opens correctly
- [ ] 5.5 Clean up unused old components

---

## Page Designs

### Subscription Tab — "Manage your MONEY"

**Purpose:** Handle payments, plan status, billing actions

**Free User:**
```
┌─ Current Plan ──────────────────────┐  ┌─ Payment Method ─────┐
│  Free Plan         [No subscription]│  │                      │
│  $0/month                           │  │  No payment method   │
│                                     │  │  Add one after       │
│  7 / 10 generations today           │  │  upgrading to Pro    │
│  Resets at midnight UTC             │  │                      │
│                                     │  └──────────────────────┘
│  [Upgrade to Pro — $99/mo ▸]        │
└─────────────────────────────────────┘

┌─ Billing History ──────────────────────────────────────────────┐
│  No billing history yet                                        │
└────────────────────────────────────────────────────────────────┘
```

**Pro User:**
```
┌─ Current Plan ──────────────────────┐  ┌─ Payment Method ─────┐
│  Pro Plan              [Active ✓]   │  │  Visa ••4242         │
│  $99/month                          │  │  Expires 12/2028     │
│  Renews Mar 12, 2026                │  │                      │
│                                     │  │  [Manage Billing ▸]  │
│  85,000 credits remaining           │  └──────────────────────┘
│                                     │
│  [Manage Billing ▸]  [Buy Credits]  │  ┌─ Add-on Credits ─────┐
│                                     │  │  500 credits         │
└─────────────────────────────────────┘  │  (never expire)      │
                                         │  [Buy More ▸]        │
                                         └──────────────────────┘

┌─ Billing History ──────────────────────────────────────────────┐
│  Invoice       Amount     Status     Date                      │
│  INV-001       $99.00     Paid ✓     Feb 12, 2026      [PDF]   │
└────────────────────────────────────────────────────────────────┘
```

### Usage Tab — "Understand your CONSUMPTION"

**Purpose:** Visualize usage patterns, track spending, plan ahead

```
┌─ Usage Overview ─────────────────────────────────────────────────┐
│  Credits Used This Month                       [Last 7 days ▾]  │
│  15,000 of 100,000 used                                         │
│                                                                  │
│     ╭──────────────────────────────────────────────────╮        │
│  3k │                            ╭───╮                  │        │
│     │                     ╭─────╯   ╰──╮               │        │
│  2k │              ╭─────╯              ╰──╮            │        │
│     │       ╭─────╯                        ╰───╮        │        │
│  1k │ ╭────╯                                   ╰───╮    │        │
│     │╯                                             ╰───│        │
│   0 ╰──────────────────────────────────────────────────╯        │
│       Feb 6   Feb 7   Feb 8   Feb 9   Feb 10  Feb 11  Today     │
└──────────────────────────────────────────────────────────────────┘

┌─ Credit Breakdown ────────────────────────────────────────────────┐
│  Monthly Credits                                  Resets Mar 12   │
│  ██████████████░░░░░░░░░░░░░░░░░░░░░░░  15,000 / 100,000 (15%)   │
│                                                                   │
│  Add-on Credits                                   Never expires   │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  500 available            │
└───────────────────────────────────────────────────────────────────┘
```

### Paywall Modals

**Free User (daily limit reached):**
```
┌─────────────────────────────────────────────────────┐
│  ⚠️  Daily Limit Reached                            │
│                                                     │
│  You've used all 10 free generations for today.    │
│                                                     │
│  ┌─────────────────────────────────────────┐       │
│  │  Upgrade to Pro                          │       │
│  │  $99/month • 100,000 credits • No limits │       │
│  │       [Upgrade to Pro — $99/mo ▸]        │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  Or wait — resets in 8 hours                       │
└─────────────────────────────────────────────────────┘
```

**Pro User (monthly credits exhausted):**
```
┌─────────────────────────────────────────────────────┐
│  ⚠️  Monthly Credits Exhausted                      │
│                                                     │
│  You've used all 100,000 monthly credits.          │
│  Buy add-on credits to continue generating.        │
│                                                     │
│  ┌─────────┬─────────┬─────────┬─────────┐        │
│  │   100   │   500   │  1,000  │  5,000  │        │
│  │   $5    │   $25   │  $50 ★  │  $250   │        │
│  └─────────┴─────────┴─────────┴─────────┘        │
│                                                     │
│  [Buy 1,000 Credits — $50]                         │
│                                                     │
│  Renews in 28 days with fresh credits              │
└─────────────────────────────────────────────────────┘
```

---

## API Response Shapes (Reference)

### GET /api/billing
```json
{
  "tier": "pro",
  "subscription": {
    "status": "active",
    "planType": "pro",
    "creditsIncluded": 100000,
    "creditsUsed": 15000,
    "cancelAtPeriodEnd": false,
    "currentPeriodEnd": "2026-03-12T00:00:00Z"
  },
  "nextBilling": "2026-03-12T00:00:00Z",
  "credits": { ... }
}
```

### GET /api/quota
```json
{
  "quota": {
    "used": 7,
    "limit": 10,
    "remaining": 3,
    "resetsAt": "2026-02-13T00:00:00Z",
    "unlimited": false
  },
  "credits": {
    "daily": { "used": 7, "limit": 10, "remaining": 3 },
    "monthly": { "used": 15000, "limit": 100000, "remaining": 85000 },
    "payg": { "balance": 500 },
    "overage": null,
    "total": 85500
  }
}
```

### GET /api/usage/history (To Be Created)
```json
{
  "period": "7d",
  "data": [
    { "date": "2026-02-06", "credits": 2340 },
    { "date": "2026-02-07", "credits": 1890 },
    { "date": "2026-02-08", "credits": 3100 },
    ...
  ]
}
```

---

## Design System Reference

- **Card:** `bg-[#0a0a0a] rounded-xl border border-scai-border-bright`
- **Button Primary:** `bg-gradient-primary` via Button component
- **Button Secondary:** `variant="secondary"` via Button component
- **Progress Bar:** `Progress` component from `@/components/ui/Progress`
- **Page Layout:** `PageHeader`, `PageContent`, `PageSection` from `@/components/layout/PageLayout`
- **Empty State:** `EmptyState` from `@/components/layout/PageLayout`

---

## Notes

- No "Choose Your Plan" page — single "Upgrade to Pro" button goes straight to Stripe
- Subscription shows ONE-LINE credit summary, Usage shows detailed breakdown
- Paywall triggers on 402 from `/api/generate`
- Add-on credits only shown to Pro users
- Payment methods managed entirely via Stripe portal
