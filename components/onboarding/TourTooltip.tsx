"use client";

import { motion } from "motion/react";
import { ChevronRight, ChevronLeft, X } from "lucide-react";

interface TourTooltipProps {
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  placement: "top" | "bottom" | "left" | "right";
  targetRect: DOMRect;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const TOOLTIP_GAP = 12;
const TOOLTIP_WIDTH = 288; // w-72
const TOOLTIP_WIDTH_MOBILE = 256; // w-64

function getTooltipPosition(
  placement: "top" | "bottom" | "left" | "right",
  rect: DOMRect,
  padding: number
) {
  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 768;
  const w = isMobile ? TOOLTIP_WIDTH_MOBILE : TOOLTIP_WIDTH;

  // Padded rect bounds
  const top = rect.top - padding;
  const left = rect.left - padding;
  const bottom = rect.bottom + padding;
  const right = rect.right + padding;
  const cx = left + (right - left) / 2;
  const cy = top + (bottom - top) / 2;

  // On mobile, force top or bottom
  const effectivePlacement =
    isMobile && (placement === "left" || placement === "right")
      ? "bottom"
      : placement;

  let x: number;
  let y: number;

  switch (effectivePlacement) {
    case "top":
      x = Math.max(8, Math.min(cx - w / 2, window.innerWidth - w - 8));
      y = top - TOOLTIP_GAP;
      return { x, y, anchor: "bottom" as const };
    case "bottom":
      x = Math.max(8, Math.min(cx - w / 2, window.innerWidth - w - 8));
      y = bottom + TOOLTIP_GAP;
      return { x, y, anchor: "top" as const };
    case "left":
      x = left - TOOLTIP_GAP - w;
      if (x < 8) {
        // Fallback to bottom
        x = Math.max(8, Math.min(cx - w / 2, window.innerWidth - w - 8));
        y = bottom + TOOLTIP_GAP;
        return { x, y, anchor: "top" as const };
      }
      y = Math.max(8, Math.min(cy - 60, window.innerHeight - 200));
      return { x, y, anchor: "right" as const };
    case "right":
      x = right + TOOLTIP_GAP;
      if (x + w > window.innerWidth - 8) {
        // Fallback to bottom
        x = Math.max(8, Math.min(cx - w / 2, window.innerWidth - w - 8));
        y = bottom + TOOLTIP_GAP;
        return { x, y, anchor: "top" as const };
      }
      y = Math.max(8, Math.min(cy - 60, window.innerHeight - 200));
      return { x, y, anchor: "left" as const };
  }
}

export function TourTooltip({
  title,
  description,
  currentStep,
  totalSteps,
  placement,
  targetRect,
  onNext,
  onBack,
  onSkip,
}: TourTooltipProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  const pos = getTooltipPosition(placement, targetRect, 8);
  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 768;

  // Animation origin based on anchor direction
  const offsetY = pos.anchor === "bottom" ? 8 : pos.anchor === "top" ? -8 : 0;
  const offsetX = pos.anchor === "right" ? 8 : pos.anchor === "left" ? -8 : 0;

  return (
    <motion.div
      className={`fixed z-[57] ${isMobile ? "w-64" : "w-72"} rounded-xl border border-scai-border bg-scai-card p-4 shadow-card`}
      style={{
        top: pos.anchor === "bottom" ? "auto" : pos.y,
        bottom: pos.anchor === "bottom" ? `calc(100vh - ${pos.y}px)` : "auto",
        left: pos.x,
        pointerEvents: "auto",
      }}
      initial={{ opacity: 0, y: offsetY, x: offsetX }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: offsetY, x: offsetX }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <h3 className="text-sm font-semibold text-scai-text">{title}</h3>
        <button
          onClick={onSkip}
          className="ml-2 -mr-1 -mt-1 rounded-md p-1 text-scai-text-muted hover:text-scai-text transition-colors"
          aria-label="Close tour"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed text-scai-text-sec mb-4">
        {description}
      </p>

      {/* Footer: dots + navigation */}
      <div className="flex items-center justify-between">
        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep
                  ? "w-4 bg-scai-brand1"
                  : "w-1.5 bg-scai-border"
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              onClick={onBack}
              className="flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs text-scai-text-sec hover:text-scai-text transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
              Back
            </button>
          )}
          <button
            onClick={onNext}
            className="flex items-center gap-0.5 rounded-lg bg-scai-brand1 px-3 py-1.5 text-xs font-medium text-scai-page hover:opacity-90 transition-opacity"
          >
            {isLast ? "Finish" : "Next"}
            {!isLast && <ChevronRight className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
