"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, AlertTriangle, Info, DollarSign, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

export interface OverageCapSettingProps {
  currentCap: number;
  onUpdateCap?: (newCap: number) => void;
  isLoading?: boolean;
  pricePerCredit?: number;
  className?: string;
}

const presetCaps = [0, 25, 50, 100, 200, 500];

export function OverageCapSetting({
  currentCap,
  onUpdateCap,
  isLoading = false,
  pricePerCredit = 0.05,
  className,
}: OverageCapSettingProps) {
  const [selectedCap, setSelectedCap] = React.useState(currentCap);
  const [customValue, setCustomValue] = React.useState("");
  const [showCustom, setShowCustom] = React.useState(
    !presetCaps.includes(currentCap) && currentCap > 0
  );

  React.useEffect(() => {
    if (!presetCaps.includes(currentCap) && currentCap > 0) {
      setShowCustom(true);
      setCustomValue(currentCap.toString());
    }
    setSelectedCap(currentCap);
  }, [currentCap]);

  const handlePresetSelect = (cap: number) => {
    setSelectedCap(cap);
    setShowCustom(false);
    setCustomValue("");
  };

  const handleCustomToggle = () => {
    setShowCustom(true);
    setSelectedCap(-1);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setCustomValue(value);
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        setSelectedCap(numValue);
      }
    }
  };

  const handleSave = () => {
    const finalValue = showCustom ? parseInt(customValue, 10) || 0 : selectedCap;
    onUpdateCap?.(finalValue);
  };

  const hasChanges = selectedCap !== currentCap;
  const maxSpend = selectedCap * pricePerCredit;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-scai-brand1/10 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-scai-brand1" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-scai-text">
            Overage Protection
          </h3>
          <p className="text-sm text-scai-text-sec mt-0.5">
            Set a monthly spending cap for overage credits. When reached, generation will pause until next month.
          </p>
        </div>
      </div>

      {/* Preset options */}
      <div>
        <label className="block text-sm font-medium text-scai-text mb-3">
          Monthly Overage Limit
        </label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {presetCaps.map((cap) => {
            const isSelected = !showCustom && selectedCap === cap;
            return (
              <motion.button
                key={cap}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePresetSelect(cap)}
                className={cn(
                  "relative px-3 py-3 rounded-lg border text-center transition-all",
                  isSelected
                    ? "border-scai-brand1 bg-scai-brand1/10"
                    : "border-scai-border bg-scai-surface hover:border-scai-text-sec/30"
                )}
              >
                {cap === 0 ? (
                  <span className="text-sm font-medium text-scai-text">None</span>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-scai-text">
                      {cap}
                    </span>
                    <span className="text-xs text-scai-text-sec block">
                      credits
                    </span>
                  </>
                )}
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5">
                    <div className="w-4 h-4 rounded-full bg-scai-brand1 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-scai-page" />
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Custom input */}
      <div>
        <button
          onClick={handleCustomToggle}
          className={cn(
            "w-full p-4 rounded-lg border text-left transition-all",
            showCustom
              ? "border-scai-brand1 bg-scai-brand1/5"
              : "border-scai-border bg-scai-surface hover:border-scai-text-sec/30"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-scai-text">
              Custom limit
            </span>
            {showCustom && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customValue}
                  onChange={handleCustomChange}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Enter amount"
                  className="w-24 px-3 py-1.5 text-sm rounded-lg border border-scai-border bg-scai-page text-scai-text placeholder:text-scai-text-sec focus:outline-none focus:ring-2 focus:ring-scai-brand1/30"
                />
                <span className="text-sm text-scai-text-sec">credits</span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Cost preview */}
      <AnimatePresence>
        {selectedCap > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-xl border border-scai-border bg-scai-surface"
          >
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-scai-text-sec" />
              <span className="text-sm font-medium text-scai-text">
                Maximum Overage Spend
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-scai-text">
                {formatCurrency(maxSpend)}
              </span>
              <span className="text-sm text-scai-text-sec">/month</span>
            </div>
            <p className="text-xs text-scai-text-sec mt-2">
              Based on {formatCurrency(pricePerCredit)} per overage credit
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning for zero cap */}
      <AnimatePresence>
        {selectedCap === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border border-warning/30 bg-warning/5 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-scai-text">
                Overage disabled
              </p>
              <p className="text-xs text-scai-text-sec mt-1">
                Generation will stop when your monthly credits are exhausted. You can still use PAYG credits if available.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info note */}
      <div className="flex items-start gap-2 text-xs text-scai-text-sec">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Overage credits are billed at the end of each billing cycle. Changes take effect immediately.
        </p>
      </div>

      {/* Save button */}
      <div className="flex justify-end gap-3">
        {hasChanges && (
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedCap(currentCap);
              setShowCustom(!presetCaps.includes(currentCap) && currentCap > 0);
              setCustomValue(
                !presetCaps.includes(currentCap) && currentCap > 0
                  ? currentCap.toString()
                  : ""
              );
            }}
          >
            Reset
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
