"use client";

import { Button } from "@/components/ui/Button";

export interface SubscriptionCardProps {
  tier: "free" | "pro";
  status?: "active" | "canceled" | "past_due";
  planType?: "monthly" | "yearly";
  renewalDate?: string;
  features: { text: string; included: boolean }[];
  price: number;
  isLoading?: boolean;
  isManageLoading?: boolean;
  onChangePlan?: () => void;
  onManageBilling?: () => void;
  onViewPlans?: () => void;
}

export function SubscriptionCard({
  tier,
  status = "active",
  planType = "monthly",
  renewalDate,
  features,
  price,
  isLoading,
  isManageLoading,
  onChangePlan,
  onManageBilling,
  onViewPlans,
}: SubscriptionCardProps) {
  const isPro = tier === "pro";
  const planLabel = isPro ? "Pro plan" : "Free plan";
  
  // Subtitle based on plan
  const subtitle = isPro 
    ? "Unlock the full power of AI content generation"
    : "Launch your AI-website with robust content features";

  const formatRenewalDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatPrice = (amount: number) => {
    return amount.toFixed(2);
  };

  // Get status badge text
  const getStatusBadge = () => {
    if (isPro) {
      if (status === "canceled" && renewalDate) {
        return `Expires: ${formatRenewalDate(renewalDate)}`;
      }
      if (renewalDate) {
        return `Renews: ${formatRenewalDate(renewalDate)}`;
      }
      return status === "active" ? "Active subscription" : status === "past_due" ? "Past due" : "Canceled";
    }
    return "No active subscription";
  };

  const includedFeatures = features.filter((f) => f.included);

  // Split features into two columns for better layout
  const midpoint = Math.ceil(includedFeatures.length / 2);
  const leftFeatures = includedFeatures.slice(0, midpoint);
  const rightFeatures = includedFeatures.slice(midpoint);

  return (
    <div className="rounded-xl border border-scai-border-bright bg-[#0a0a0a] p-6 h-full flex flex-col">
      {/* Header row: plan name + status badge */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-scai-text">{planLabel}</h3>
        <span className="px-3 py-1.5 text-xs font-medium text-scai-text-sec border border-scai-border-bright rounded-lg whitespace-nowrap">
          {getStatusBadge()}
        </span>
      </div>

      {/* Price */}
      <div className="mb-2">
        <span className="text-4xl font-bold text-scai-text">
          ${formatPrice(price)}
        </span>
        <span className="text-base text-scai-text-sec">
          /{planType === "yearly" ? "year" : "month"}
        </span>
      </div>

      {/* Subtitle */}
      <p className="text-sm text-scai-text-sec mb-6">{subtitle}</p>

      {/* Features grid - two columns */}
      {includedFeatures.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6">
          {/* Left column */}
          <div className="flex flex-col gap-4">
            {leftFeatures.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id={`check-grad-left-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#40EDC3" />
                      <stop offset="100%" stopColor="#D3F89A" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="10" stroke={`url(#check-grad-left-${i})`} strokeWidth="2" />
                  <path d="M8 12l3 3 5-6" stroke={`url(#check-grad-left-${i})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm text-scai-text">{feature.text}</span>
              </div>
            ))}
          </div>
          {/* Right column */}
          <div className="flex flex-col gap-4">
            {rightFeatures.map((feature, i) => (
              <div key={i + midpoint} className="flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id={`check-grad-right-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#40EDC3" />
                      <stop offset="100%" stopColor="#D3F89A" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="10" stroke={`url(#check-grad-right-${i})`} strokeWidth="2" />
                  <path d="M8 12l3 3 5-6" stroke={`url(#check-grad-right-${i})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm text-scai-text">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Separator line */}
      <div className="border-t border-scai-border-bright mt-auto" />

      {/* Actions - pushed to bottom */}
      <div className="flex items-center gap-3 pt-5">
        {isPro ? (
          <Button variant="primary" size="sm" onClick={onManageBilling} isLoading={isManageLoading}>
            Manage Subscription
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={onChangePlan}
              isLoading={isLoading}
            >
              Subscribe Now
            </Button>
            <div className="p-[1px] rounded-lg bg-gradient-to-r from-[#40EDC3] to-[#D3F89A]">
              <button
                onClick={onViewPlans}
                className="px-4 py-2 rounded-[7px] bg-[#0a0a0a] text-sm font-medium text-scai-brand1 hover:bg-[#111111] transition-colors"
              >
                View Plans
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
