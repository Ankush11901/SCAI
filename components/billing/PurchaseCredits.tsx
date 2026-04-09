"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Zap, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

export interface CreditPack {
  id: string;
  credits: number;
  price: number;
  bonusCredits?: number;
  popular?: boolean;
  savings?: string;
}

export interface PurchaseCreditsProps {
  packs: CreditPack[];
  selectedPackId?: string;
  onSelectPack?: (packId: string) => void;
  onPurchase?: (packId: string) => void;
  isLoading?: boolean;
  className?: string;
}

const defaultPacks: CreditPack[] = [
  { id: "small", credits: 100, price: 5 },
  { id: "medium", credits: 500, price: 25 },
  { id: "large", credits: 1000, price: 50, popular: true },
  { id: "xlarge", credits: 5000, price: 250, savings: "Best value" },
];

export function PurchaseCredits({
  packs = defaultPacks,
  selectedPackId,
  onSelectPack,
  onPurchase,
  isLoading = false,
  className,
}: PurchaseCreditsProps) {
  const [selected, setSelected] = React.useState<string>(
    selectedPackId || packs[0]?.id || ""
  );

  const handleSelect = (packId: string) => {
    setSelected(packId);
    onSelectPack?.(packId);
  };

  const selectedPack = packs.find((p) => p.id === selected);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);

  const formatCredits = (credits: number) =>
    new Intl.NumberFormat("en-US").format(credits);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Pack selection grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packs.map((pack) => {
          const isSelected = selected === pack.id;
          const totalCredits = pack.credits + (pack.bonusCredits || 0);
          const pricePerCredit = (pack.price / totalCredits).toFixed(3);

          return (
            <motion.button
              key={pack.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(pack.id)}
              className={cn(
                "relative p-5 rounded-xl border text-left transition-all",
                isSelected
                  ? "border-scai-brand1 bg-scai-brand1/5"
                  : "border-scai-border-bright bg-[#0a0a0a] hover:border-scai-brand1/30"
              )}
            >
              {/* Popular badge */}
              {pack.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-gradient-primary text-xs font-semibold text-scai-page">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Savings badge */}
              {pack.savings && (
                <div className="absolute -top-2 -right-2">
                  <span className="px-2 py-0.5 rounded-full bg-scai-brand1/20 text-xs font-semibold text-scai-brand1">
                    Save {pack.savings}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isSelected
                      ? "bg-gradient-primary"
                      : "bg-scai-surface"
                  )}
                >
                  <Zap
                    className={cn(
                      "w-5 h-5",
                      isSelected ? "text-scai-page" : "text-scai-brand1"
                    )}
                  />
                </div>
                <div>
                  <p className="text-lg font-bold text-scai-text">
                    {formatCredits(pack.credits)}
                  </p>
                  <p className="text-xs text-scai-text-sec">credits</p>
                </div>
              </div>

              {/* Bonus credits */}
              {pack.bonusCredits && (
                <div className="mb-3 flex items-center gap-2 text-scai-brand1">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    +{formatCredits(pack.bonusCredits)} bonus
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="space-y-1">
                <p className="text-2xl font-bold text-scai-text">
                  {formatPrice(pack.price)}
                </p>
                <p className="text-xs text-scai-text-sec">
                  ${pricePerCredit} per credit
                </p>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 rounded-full bg-scai-brand1 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-scai-page" />
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Summary and purchase */}
      {selectedPack && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-scai-border-bright bg-scai-surface"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-scai-text-sec">Selected Pack</p>
              <p className="text-lg font-bold text-scai-text">
                {formatCredits(
                  selectedPack.credits + (selectedPack.bonusCredits || 0)
                )}{" "}
                credits
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-scai-text-sec">Total</p>
              <p className="text-2xl font-bold text-scai-text">
                {formatPrice(selectedPack.price)}
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={() => onPurchase?.(selectedPack.id)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Purchase Credits
              </>
            )}
          </Button>

          <p className="text-xs text-scai-text-sec text-center mt-3">
            Credits never expire • Secure payment via Stripe
          </p>
        </motion.div>
      )}
    </div>
  );
}
