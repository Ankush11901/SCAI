"use client";

export interface PlanComparisonCardProps {
  name: string;
  price: number;
  period: "month" | "year";
  subtitle?: string;
  features: readonly { readonly text: string; readonly included: boolean }[];
  isCurrentPlan: boolean;
  isHighlighted?: boolean;
  onSelect: () => void;
  isLoading?: boolean;
}

export function PlanComparisonCard({
  name,
  price,
  period,
  subtitle,
  features,
  isCurrentPlan,
  isHighlighted = false,
  onSelect,
  isLoading = false,
}: PlanComparisonCardProps) {
  const includedFeatures = features.filter((f) => f.included);

  return (
    <div
      className={`rounded-xl border p-6 flex flex-col h-full ${
        isHighlighted
          ? "border-scai-brand1/50 bg-[#0a0a0a]"
          : "border-scai-border-bright bg-[#0a0a0a]"
      }`}
    >
      {/* Plan Name */}
      <h3 className="text-lg font-semibold text-scai-text mb-3">{name}</h3>

      {/* Price */}
      <div className="mb-2">
        <span className="text-4xl font-bold text-scai-text">${price}</span>
        <span className="text-base text-scai-text-sec"> /Month</span>
      </div>

      {/* Subtitle */}
      <p className="text-sm text-scai-brand1 mb-5">
        {subtitle || "Choose the plan that fits your needs"}
      </p>

      {/* CTA Button - Full width */}
      {isCurrentPlan ? (
        <button
          disabled
          className="w-full py-2.5 rounded-lg bg-gradient-primary text-black font-medium text-sm opacity-70 cursor-not-allowed"
        >
          Current Plan
        </button>
      ) : (
        <button
          onClick={onSelect}
          disabled={isLoading}
          className="w-full py-2.5 rounded-lg bg-gradient-primary text-black font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Subscribe Now"}
        </button>
      )}

      {/* Separator line */}
      <div className="border-t border-scai-border-bright my-6" />

      {/* Key Benefits Section */}
      {includedFeatures.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-scai-text mb-4">Key Benefits:</p>
          <div className="flex flex-col gap-3">
            {includedFeatures.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id={`plan-check-${name}-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#40EDC3" />
                      <stop offset="100%" stopColor="#D3F89A" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="10" stroke={`url(#plan-check-${name}-${i})`} strokeWidth="2" />
                  <path d="M8 12l3 3 5-6" stroke={`url(#plan-check-${name}-${i})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm text-scai-text">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
