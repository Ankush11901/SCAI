"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface GenerationProgressProps {
  steps: Step[];
  currentStep: string;
  completedSteps: string[];
  progress: number;
  statusMessage?: string;
  className?: string;
}

/**
 * GenerationProgress
 * Step-by-step progress tracker with animated indicators
 */
export function GenerationProgress({
  steps,
  currentStep,
  completedSteps,
  progress,
  statusMessage,
  className,
}: GenerationProgressProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress bar with spring physics */}
      <div className="relative">
        <div className="h-2 bg-scai-input rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              mass: 0.5,
            }}
          />
        </div>
        <motion.div
          className="absolute -top-1 w-4 h-4 bg-scai-brand1 rounded-full shadow-glow"
          initial={{ left: 0 }}
          animate={{ left: `calc(${progress}% - 8px)` }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 20,
            mass: 0.5,
          }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isPending = !isCompleted && !isCurrent;

          return (
            <motion.div
              key={step.id}
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Step circle */}
              <motion.div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                  isCompleted && "bg-scai-brand1 border-scai-brand1",
                  isCurrent && "border-scai-brand1 bg-scai-brand1/10",
                  isPending && "border-scai-border bg-scai-input"
                )}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={
                  isCurrent
                    ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                    : undefined
                }
              >
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 45 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 25,
                      }}
                    >
                      <Check className="w-5 h-5 text-scai-page" />
                    </motion.div>
                  ) : isCurrent ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Loader2 className="w-5 h-5 text-scai-brand1 animate-spin" />
                    </motion.div>
                  ) : (
                    <motion.span
                      key="number"
                      className="text-sm font-medium text-scai-text-muted"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {index + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Step label */}
              <span
                className={cn(
                  "text-xs font-medium text-center",
                  isCompleted && "text-scai-brand1",
                  isCurrent && "text-scai-text",
                  isPending && "text-scai-text-muted"
                )}
              >
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Status message with content reveal animation */}
      <AnimatePresence mode="wait">
        {statusMessage && (
          <motion.div
            key={statusMessage}
            className="text-center text-sm text-scai-text-sec"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {statusMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * ContentReveal
 * Animated reveal for streamed content
 */
interface ContentRevealProps {
  children: React.ReactNode;
  isStreaming?: boolean;
  className?: string;
}

export function ContentReveal({
  children,
  isStreaming,
  className,
}: ContentRevealProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
      {/* Streaming cursor indicator */}
      <AnimatePresence>
        {isStreaming && (
          <motion.span
            className="inline-block w-2 h-4 bg-scai-brand1 ml-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: [1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * ImageGenerationProgress
 * Progress indicator for image generation
 */
interface ImageGenerationProgressProps {
  current: number;
  total: number;
  currentHeading?: string;
  className?: string;
}

export function ImageGenerationProgress({
  current,
  total,
  currentHeading,
  className,
}: ImageGenerationProgressProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <motion.div
      className={cn(
        "p-4 bg-scai-input/50 rounded-xl border border-scai-border",
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <div className="flex items-center gap-3 mb-3">
        <motion.div
          className="w-8 h-8 rounded-lg bg-scai-brand1/20 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Loader2 className="w-4 h-4 text-scai-brand1 animate-spin" />
        </motion.div>
        <div className="flex-1">
          <div className="text-sm font-medium">
            Generating images ({current}/{total})
          </div>
          {currentHeading && (
            <div className="text-xs text-scai-text-muted truncate">
              {currentHeading}
            </div>
          )}
        </div>
      </div>

      {/* Image progress bar */}
      <div className="h-1.5 bg-scai-input rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-scai-brand1"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </div>

      {/* Image dots */}
      <div className="flex gap-1 mt-3 justify-center">
        {Array.from({ length: total }).map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full",
              i < current ? "bg-scai-brand1" : "bg-scai-border"
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
