"use client";

import { motion, AnimatePresence } from "motion/react";
import { Loader2, ImageIcon, CheckCircle2, Clock } from "lucide-react";
import type { GenerationState } from "@/lib/hooks/useArticleGeneration";

interface GenerationProgressProps {
  state: GenerationState;
  elapsedTime?: number;
}

/**
 * Format seconds into MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get phase label for display
 */
function getPhaseLabel(phase: GenerationState["phase"]): string {
  switch (phase) {
    case "content":
      return "Writing Content";
    case "images":
      return "Generating Images";
    case "finalizing":
      return "Finalizing";
    case "done":
      return "Complete";
    default:
      return "Processing";
  }
}

/**
 * Get phase icon for display
 */
function PhaseIcon({ phase }: { phase: GenerationState["phase"] }) {
  switch (phase) {
    case "content":
      return <Loader2 className="h-4 w-4 animate-spin" />;
    case "images":
      return <ImageIcon className="h-4 w-4" />;
    case "finalizing":
      return <Loader2 className="h-4 w-4 animate-spin" />;
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-[#40EDC3]" />;
    default:
      return <Loader2 className="h-4 w-4 animate-spin" />;
  }
}

export function GenerationProgress({ state, elapsedTime }: GenerationProgressProps) {
  if (state.status !== "generating") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      {/* Phase indicator with timer */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-scai-brand1/10">
            <PhaseIcon phase={state.phase} />
          </div>
          <span className="font-medium text-scai-text-sec">
            {getPhaseLabel(state.phase)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {elapsedTime !== undefined && (
            <div className="flex items-center gap-1.5 text-scai-text-muted">
              <Clock className="h-3 w-3" />
              <span className="font-mono text-xs">{formatTime(elapsedTime)}</span>
            </div>
          )}
          <span className="text-xs font-semibold tabular-nums text-scai-text-muted">{Math.round(state.progress)}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-scai-surface rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-scai-brand1 via-scai-brand2 to-scai-brand3 relative"
          initial={{ width: 0 }}
          animate={{ width: `${state.progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </motion.div>
      </div>

      {/* Status message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={state.statusMessage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-xs text-scai-text-muted"
        >
          {state.statusMessage}
        </motion.p>
      </AnimatePresence>

      {/* Image progress details */}
      {state.phase === "images" && state.currentImage && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 p-3 bg-scai-surface rounded-xl border border-scai-border"
        >
          <div className="flex items-center gap-2.5 text-sm">
            <div className="w-7 h-7 bg-scai-brand1/10 rounded-lg flex items-center justify-center">
              <ImageIcon className="h-3.5 w-3.5 text-scai-brand1" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-scai-text font-medium text-xs truncate">
                Image {state.currentImage.index} of {state.currentImage.total}
              </p>
              {state.currentImage.description && (
                <p className="text-scai-text-muted text-[11px] truncate">
                  {state.currentImage.description}
                </p>
              )}
            </div>
          </div>

          {/* Mini progress for images */}
          {state.imageProgress && state.imageProgress.total > 0 && (
            <div className="mt-2.5 flex gap-1">
              {Array.from({ length: state.imageProgress.total }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    i < state.imageProgress!.completed
                      ? "bg-scai-brand1"
                      : i === state.imageProgress!.completed
                      ? "bg-scai-brand1/40"
                      : "bg-scai-border"
                  }`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
