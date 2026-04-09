"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { TourTooltip } from "./TourTooltip";
import type { TourStep } from "./tour-steps";

interface SpotlightTourProps {
  steps: TourStep[];
  isActive: boolean;
  currentStep: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const SPOTLIGHT_PADDING = 8;
const SPOTLIGHT_RADIUS = 12;

export function SpotlightTour({
  steps,
  isActive,
  currentStep,
  onNext,
  onBack,
  onSkip,
}: SpotlightTourProps) {
  const [mounted, setMounted] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const targetElRef = useRef<Element | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const recalcTimerRef = useRef<number | null>(null);

  // SSR safety: only render portal on client
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Find target element and track its position
  const updateRect = useCallback(() => {
    if (!targetElRef.current) return;
    const rect = targetElRef.current.getBoundingClientRect();
    setTargetRect(rect);
  }, []);

  // When step changes, find the new target element
  useEffect(() => {
    if (!isActive || !mounted) return;

    const step = steps[currentStep];
    if (!step) return;

    const el = document.querySelector(`[data-tour="${step.target}"]`);
    targetElRef.current = el;

    if (!el) {
      // Element not found — skip to next step
      console.warn(`[SpotlightTour] Target "${step.target}" not found, skipping`);
      onNext();
      return;
    }

    // Scroll into view
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // Wait for scroll to settle, then measure
    const timer = setTimeout(() => {
      updateRect();
    }, 350);

    // Observe resizes
    resizeObserverRef.current?.disconnect();
    const observer = new ResizeObserver(() => {
      updateRect();
    });
    observer.observe(el);
    resizeObserverRef.current = observer;

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [isActive, mounted, currentStep, steps, onNext, updateRect]);

  // Recalculate rect on scroll and resize
  useEffect(() => {
    if (!isActive) return;

    const handleUpdate = () => {
      if (recalcTimerRef.current) cancelAnimationFrame(recalcTimerRef.current);
      recalcTimerRef.current = requestAnimationFrame(updateRect);
    };

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
      if (recalcTimerRef.current) cancelAnimationFrame(recalcTimerRef.current);
    };
  }, [isActive, updateRect]);

  // Lock body scroll when tour is active
  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isActive]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onSkip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        onNext();
      } else if (e.key === "ArrowLeft") {
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, onNext, onBack, onSkip]);

  if (!mounted || !isActive) return null;

  const step = steps[currentStep];
  if (!step) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      <div key={`tour-step-${currentStep}`}>
        {/* Click-away overlay */}
        <div
          className="fixed inset-0 z-[55]"
          style={{ pointerEvents: "auto" }}
          onClick={onSkip}
        />

        {/* Spotlight cutout */}
        {targetRect && (
          <motion.div
            className="fixed rounded-xl"
            style={{
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.75)",
              borderRadius: SPOTLIGHT_RADIUS,
              pointerEvents: "none",
              zIndex: 55,
            }}
            initial={false}
            animate={{
              top: targetRect.top - SPOTLIGHT_PADDING,
              left: targetRect.left - SPOTLIGHT_PADDING,
              width: targetRect.width + SPOTLIGHT_PADDING * 2,
              height: targetRect.height + SPOTLIGHT_PADDING * 2,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}

        {/* Glow ring around spotlight */}
        {targetRect && (
          <motion.div
            className="fixed rounded-xl border border-scai-brand1/40"
            style={{
              pointerEvents: "none",
              zIndex: 56,
            }}
            initial={false}
            animate={{
              top: targetRect.top - SPOTLIGHT_PADDING - 1,
              left: targetRect.left - SPOTLIGHT_PADDING - 1,
              width: targetRect.width + SPOTLIGHT_PADDING * 2 + 2,
              height: targetRect.height + SPOTLIGHT_PADDING * 2 + 2,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}

        {/* Tooltip */}
        {targetRect && (
          <TourTooltip
            title={step.title}
            description={step.description}
            currentStep={currentStep}
            totalSteps={steps.length}
            placement={step.placement}
            targetRect={targetRect}
            onNext={onNext}
            onBack={onBack}
            onSkip={onSkip}
          />
        )}
      </div>
    </AnimatePresence>,
    document.body
  );
}
