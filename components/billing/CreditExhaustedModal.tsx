"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Check, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";

export interface CreditPack {
  id: string;
  credits: number;
  price: number; // in dollars
  popular?: boolean;
}

export interface CreditExhaustedModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: "free" | "pro";
  // Free user props
  resetsIn?: string; // e.g. "8 hours"
  // Pro user props
  renewsIn?: string; // e.g. "28 days"
  creditPacks?: CreditPack[];
  onUpgrade?: () => void;
  onBuyCredits?: (packId: string) => void;
  // Contextual info (optional — for bulk/cluster generation shortfall)
  creditsRequired?: number;
  creditsAvailable?: number;
}

const DEFAULT_CREDIT_PACKS: CreditPack[] = [
  { id: "100", credits: 100, price: 5 },
  { id: "500", credits: 500, price: 25 },
  { id: "1000", credits: 1000, price: 50, popular: true },
  { id: "5000", credits: 5000, price: 250 },
];

export function CreditExhaustedModal({
  isOpen,
  onClose,
  tier,
  resetsIn,
  renewsIn,
  creditPacks = DEFAULT_CREDIT_PACKS,
  onUpgrade,
  onBuyCredits,
  creditsRequired,
  creditsAvailable,
}: CreditExhaustedModalProps) {
  const [selectedPack, setSelectedPack] = useState<string>(
    creditPacks.find((p) => p.popular)?.id || creditPacks[0]?.id || ""
  );
  const [loading, setLoading] = useState(false);

  const isPro = tier === "pro";

  // Contextual shortfall info
  const hasShortfall = creditsRequired !== undefined && creditsAvailable !== undefined;
  const shortfall = hasShortfall ? Math.max(0, creditsRequired - creditsAvailable) : 0;
  const isFullyExhausted = !hasShortfall || creditsAvailable === 0;

  // Auto-select the smallest pack that covers the shortfall (for pro users)
  const recommendedPack = isPro && shortfall > 0
    ? creditPacks.find((p) => p.credits >= shortfall) || creditPacks[creditPacks.length - 1]
    : null;

  // When modal opens with a shortfall, auto-select the recommended pack
  useEffect(() => {
    if (isOpen && recommendedPack) {
      setSelectedPack(recommendedPack.id);
    }
  }, [isOpen, recommendedPack]);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      onUpgrade?.();
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCredits = async () => {
    if (!selectedPack) return;
    setLoading(true);
    try {
      onBuyCredits?.(selectedPack);
    } finally {
      setLoading(false);
    }
  };

  const formatCredits = (n: number) => n.toLocaleString();
  const selectedPackData = creditPacks.find((p) => p.id === selectedPack);

  // Gradient circle checkmark SVG (outlined, like PlanComparisonCard)
  const GradientCircleCheck = ({ index }: { index: number }) => (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`paywall-check-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#40EDC3" />
          <stop offset="100%" stopColor="#D3F89A" />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={`url(#paywall-check-${index})`}
        strokeWidth="2"
      />
      <path
        d="M8 12l3 3 5-6"
        stroke={`url(#paywall-check-${index})`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showClose className="max-w-md p-0 bg-scai-surface">
        {/* Header */}
        <DialogHeader className="p-5 pb-0 mb-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {hasShortfall && !isFullyExhausted
                  ? "Not Enough Credits"
                  : "Credits Exhausted"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {hasShortfall && !isFullyExhausted
                  ? `You need ${formatCredits(shortfall)} more credits for this generation`
                  : isPro
                    ? "You've used all your monthly credits"
                    : "You've used all your free monthly credits"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-5">
          {isPro ? (
            <>
              {/* Pro User: Credit Pack Selector */}
              {hasShortfall && (
                <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-scai-text-sec">Required</span>
                    <span className="font-semibold text-scai-text">{formatCredits(creditsRequired!)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-scai-text-sec">Available</span>
                    <span className="font-semibold text-scai-text">{formatCredits(creditsAvailable!)}</span>
                  </div>
                  <div className="border-t border-amber-500/20 mt-2 pt-2 flex items-center justify-between text-sm">
                    <span className="text-amber-500 font-medium">Shortfall</span>
                    <span className="font-bold text-amber-500">{formatCredits(shortfall)}</span>
                  </div>
                </div>
              )}
              <p className="text-sm text-scai-text-sec mb-4">
                {hasShortfall && !isFullyExhausted
                  ? "Top up your credits to continue with this generation."
                  : "Buy add-on credits to continue generating."}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {creditPacks.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPack(pack.id)}
                    className={`relative p-4 rounded-xl border transition-all text-left ${
                      selectedPack === pack.id
                        ? "border-scai-brand1 bg-scai-brand1/10"
                        : "border-scai-border hover:border-scai-border-bright"
                    }`}
                  >
                    {pack.popular && (
                      <span className="absolute -top-2 left-3 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-scai-brand1 text-scai-page">
                        Popular
                      </span>
                    )}
                    <div className="text-xl font-bold text-scai-text">
                      {formatCredits(pack.credits)}
                    </div>
                    <div className="text-xs text-scai-text-muted">credits</div>
                    <div className="text-sm font-medium text-scai-text-sec mt-1">
                      ${pack.price}
                    </div>
                    {selectedPack === pack.id && (
                      <Check className="absolute top-3 right-3 w-4 h-4 text-scai-brand1" />
                    )}
                  </button>
                ))}
              </div>

              <Button
                variant="primary"
                className="w-full"
                isLoading={loading}
                onClick={handleBuyCredits}
              >
                Buy {formatCredits(selectedPackData?.credits || 0)} Credits — $
                {selectedPackData?.price || 0}
              </Button>

              {renewsIn && (
                <p className="text-xs text-scai-text-muted text-center mt-4 flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Renews in {renewsIn} with fresh credits
                </p>
              )}
            </>
          ) : (
            <>
              {/* Free User: Pro Plan Card (matching PlanComparisonCard design) */}
              <div className="rounded-xl border border-scai-brand1/50 bg-[#0a0a0a] p-6 flex flex-col">
                {/* Plan Name */}
                <h3 className="text-lg font-semibold text-scai-text mb-3">Pro</h3>

                {/* Price */}
                <div className="mb-2">
                  <span className="text-4xl font-bold text-scai-text">$99</span>
                  <span className="text-base text-scai-text-sec"> /Month</span>
                </div>

                {/* Subtitle */}
                <p className="text-sm text-scai-brand1 mb-5">
                  Advanced features for content professionals
                </p>

                {/* CTA Button - Full width with gradient */}
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-gradient-primary text-black font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Upgrade to Pro"
                  )}
                </button>

                {/* Separator line */}
                <div className="border-t border-scai-border-bright my-6" />

                {/* Key Benefits Section */}
                <div>
                  <p className="text-sm font-semibold text-scai-text mb-4">
                    Key Benefits:
                  </p>
                  <div className="flex flex-col gap-3">
                    {[
                      "2,000 credits/month (~125 articles)",
                      "Up to 5,000 words per article",
                      "Bulk article generation",
                      "Bulk WordPress export",
                      "Gemini premium images available",
                      "Cluster mode",
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <GradientCircleCheck index={i} />
                        <span className="text-sm text-scai-text">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {resetsIn && (
                <p className="text-sm text-scai-text-sec text-center mt-5 flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Or wait — resets in {resetsIn}
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
