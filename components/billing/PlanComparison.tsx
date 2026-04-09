"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PlanComparisonCard } from "./PlanComparisonCard";
import { PLANS } from "@/lib/billing/constants";

export interface PlanComparisonProps {
  currentTier: "free" | "pro";
  onSelectPlan: (plan: "free" | "pro", period: "monthly" | "yearly") => void;
  onBack?: () => void;
  isLoading?: boolean;
  loadingPlan?: "free" | "pro" | null;
}

export function PlanComparison({
  currentTier,
  onSelectPlan,
  onBack,
  isLoading = false,
  loadingPlan = null,
}: PlanComparisonProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const isYearly = billingPeriod === "yearly";
  const proPrice = isYearly ? PLANS.pro.priceYearly : PLANS.pro.price;

  return (
    <div className="space-y-6">
      {/* Back Button - separate row */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-scai-text-sec hover:text-scai-text transition-colors px-3 py-1.5 rounded-lg border border-scai-border-bright hover:border-scai-border bg-transparent"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      {/* Header with Title and Toggle */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-scai-text">Choose Your Plan</h2>

        {/* Monthly/Yearly Toggle */}
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium ${
              !isYearly ? "text-scai-text" : "text-scai-text-sec"
            }`}
          >
            Monthly
          </span>

          {/* Toggle Switch - gradient knob, gray track */}
          <button
            onClick={() => setBillingPeriod(isYearly ? "monthly" : "yearly")}
            className="relative w-12 h-6 rounded-full transition-colors bg-scai-border-bright"
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-gradient-primary transition-transform ${
                isYearly ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>

          <span
            className={`text-sm font-medium ${
              isYearly ? "text-scai-text" : "text-scai-text-sec"
            }`}
          >
            Yearly
          </span>

          {/* Save Badge */}
          <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-gradient-to-r from-scai-brand1 to-scai-brand2 text-black">
            Save 20%
          </span>
        </div>
      </div>

      {/* Separator line */}
      <div className="border-t border-scai-border-bright" />

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan */}
        <PlanComparisonCard
          name="Free"
          price={PLANS.free.price}
          period="month"
          subtitle="Free access with limited monthly credits"
          features={PLANS.free.features}
          isCurrentPlan={currentTier === "free"}
          onSelect={() => {
            // Free plan doesn't need subscription
          }}
          isLoading={false}
        />

        {/* Pro Plan */}
        <PlanComparisonCard
          name="Pro"
          price={proPrice}
          period={isYearly ? "year" : "month"}
          subtitle={
            isYearly
              ? "Save up to 20% with annual billing cycle."
              : "Advanced features for content professionals"
          }
          features={PLANS.pro.features}
          isCurrentPlan={currentTier === "pro"}
          isHighlighted
          onSelect={() => onSelectPlan("pro", billingPeriod)}
          isLoading={isLoading && loadingPlan === "pro"}
        />
      </div>
    </div>
  );
}