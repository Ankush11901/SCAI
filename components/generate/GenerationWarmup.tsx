"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  ListTree,
  PenTool,
  Sparkles,
  Globe,
  BarChart3,
  FileText,
  Link2,
  BookOpen,
  Layers,
  Target,
  Lightbulb,
  Puzzle,
  TrendingUp,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

interface Phase {
  icon: LucideIcon;
  label: string;
}

const WARMUP_MESSAGES: Phase[] = [
  { icon: Search, label: "Analyzing your topic..." },
  { icon: Sparkles, label: "Researching SEO keywords..." },
  { icon: Globe, label: "Scanning top-ranking pages..." },
  { icon: BarChart3, label: "Evaluating keyword difficulty..." },
  { icon: Target, label: "Identifying search intent..." },
  { icon: ListTree, label: "Building article outline..." },
  { icon: Lightbulb, label: "Generating heading ideas..." },
  { icon: Layers, label: "Structuring content sections..." },
  { icon: Link2, label: "Planning internal link opportunities..." },
  { icon: BookOpen, label: "Researching supporting sources..." },
  { icon: FileText, label: "Drafting introduction hook..." },
  { icon: Puzzle, label: "Mapping related subtopics..." },
  { icon: TrendingUp, label: "Optimizing for featured snippets..." },
  { icon: MessageSquare, label: "Crafting engaging subheadings..." },
  { icon: PenTool, label: "Refining content structure..." },
  { icon: Sparkles, label: "Adding semantic richness..." },
  { icon: Target, label: "Aligning with user intent..." },
  { icon: BarChart3, label: "Scoring content relevance..." },
  { icon: Globe, label: "Checking competitor coverage..." },
  { icon: FileText, label: "Polishing meta descriptions..." },
  { icon: Lightbulb, label: "Generating FAQ sections..." },
  { icon: Layers, label: "Organizing content hierarchy..." },
  { icon: Search, label: "Analyzing readability scores..." },
  { icon: Link2, label: "Building topic clusters..." },
  { icon: Target, label: "Optimizing keyword density..." },
  { icon: BookOpen, label: "Cross-referencing authority sources..." },
  { icon: BarChart3, label: "Calculating content depth score..." },
  { icon: Puzzle, label: "Weaving in LSI keywords..." },
  { icon: Globe, label: "Benchmarking against top results..." },
  { icon: MessageSquare, label: "Generating transition phrases..." },
  { icon: TrendingUp, label: "Enhancing E-E-A-T signals..." },
  { icon: Lightbulb, label: "Adding expert insights..." },
  { icon: FileText, label: "Structuring schema markup..." },
  { icon: Layers, label: "Balancing keyword placement..." },
  { icon: Search, label: "Verifying content accuracy..." },
  { icon: PenTool, label: "Polishing sentence flow..." },
  { icon: Sparkles, label: "Enriching with contextual data..." },
  { icon: Target, label: "Fine-tuning content angles..." },
  { icon: BookOpen, label: "Embedding supporting evidence..." },
  { icon: Link2, label: "Mapping anchor text strategy..." },
  { icon: BarChart3, label: "Projecting ranking potential..." },
  { icon: PenTool, label: "Finalizing article blueprint..." },
  { icon: Sparkles, label: "Preparing to write..." },
];

const VISIBLE_COUNT = 5;
const TICK_MS = 2200;

interface GenerationWarmupProps {
  topic: string;
  articleType: string;
}

export function GenerationWarmup({ topic, articleType }: GenerationWarmupProps) {
  // Single state: index of the newest visible message
  const [latest, setLatest] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLatest((prev) => {
        if (prev >= WARMUP_MESSAGES.length - 1) return prev;
        return prev + 1;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // Derive visible indices from `latest`
  const visibleIndices = useMemo(() => {
    const start = Math.max(0, latest - VISIBLE_COUNT + 1);
    return Array.from({ length: Math.min(VISIBLE_COUNT, latest + 1) }, (_, i) => start + i);
  }, [latest]);

  return (
    <div className="h-full overflow-y-auto pt-6 pb-6 px-6">
      <div className="w-full mx-auto max-w-full space-y-6">
        {/* Topic context header */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-scai-text-muted mb-1">
            Generating {articleType}
          </p>
          <p className="text-sm text-scai-text-sec truncate max-w-md mx-auto">
            &quot;{topic}&quot;
          </p>
        </div>

        {/* Scrolling message ticker */}
        <div className="relative overflow-hidden">
          <AnimatePresence initial={false}>
            {visibleIndices.map((msgIdx) => {
              const phase = WARMUP_MESSAGES[msgIdx];
              const Icon = phase.icon;
              const isLatest = msgIdx === latest;

              return (
                <motion.div
                  key={msgIdx}
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 6 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{
                    height: { type: "spring", stiffness: 400, damping: 30 },
                    opacity: { duration: 0.25 },
                    marginBottom: { type: "spring", stiffness: 400, damping: 30 },
                  }}
                >
                  <div
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-300 ${
                      isLatest
                        ? "bg-scai-brand1/8 border border-scai-brand1/15 shadow-[0_0_20px_-6px_rgba(64,237,195,0.1)]"
                        : "bg-scai-card/50 border border-transparent"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ${
                        isLatest
                          ? "bg-scai-brand1/15 text-scai-brand1"
                          : "bg-scai-surface text-scai-text-muted"
                      }`}
                    >
                      {isLatest ? (
                        <motion.div
                          animate={{ scale: [1, 1.12, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </motion.div>
                      ) : (
                        <Icon className="h-3.5 w-3.5" />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        isLatest ? "text-scai-brand1" : "text-scai-text-muted"
                      }`}
                    >
                      {phase.label}
                    </span>

                    {/* Active pulse dots on latest */}
                    {isLatest && (
                      <div className="ml-auto flex gap-1">
                        {[0, 1, 2].map((dot) => (
                          <motion.div
                            key={dot}
                            className="h-1 w-1 rounded-full bg-scai-brand1"
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{
                              repeat: Infinity,
                              duration: 1,
                              delay: dot * 0.2,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Article Skeleton — Premium version */}
        <div className="space-y-4 overflow-hidden rounded-2xl border border-scai-border bg-scai-card p-6 relative">
          {/* Subtle gradient shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-scai-brand1/[0.02] via-transparent to-scai-brand3/[0.02] pointer-events-none" />

          {/* Title skeleton */}
          <div className="space-y-2 relative">
            <div className="skeleton h-5 rounded-lg" style={{ width: "75%" }} />
            <div className="skeleton h-5 rounded-lg" style={{ width: "50%" }} />
          </div>

          {/* Paragraph group 1 */}
          <div className="space-y-2 pt-3">
            <div className="skeleton h-2.5 rounded-lg w-full" />
            <div className="skeleton h-2.5 rounded-lg" style={{ width: "92%" }} />
            <div className="skeleton h-2.5 rounded-lg" style={{ width: "85%" }} />
            <div className="skeleton h-2.5 rounded-lg" style={{ width: "60%" }} />
          </div>

          {/* Subheading */}
          <div className="pt-2">
            <div className="skeleton h-4 rounded-lg" style={{ width: "40%" }} />
          </div>

          {/* Paragraph group 2 */}
          <div className="space-y-2">
            <div className="skeleton h-2.5 rounded-lg w-full" />
            <div className="skeleton h-2.5 rounded-lg" style={{ width: "88%" }} />
            <div className="skeleton h-2.5 rounded-lg" style={{ width: "95%" }} />
          </div>

          {/* Image placeholder */}
          <div className="skeleton h-28 w-full rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 border-2 border-dashed border-scai-brand1/10 rounded-xl" />
          </div>

          {/* Paragraph group 3 */}
          <div className="space-y-2 pt-1">
            <div className="skeleton h-2.5 rounded-lg w-full" />
            <div className="skeleton h-2.5 rounded-lg" style={{ width: "70%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
