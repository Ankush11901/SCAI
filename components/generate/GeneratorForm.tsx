"use client";

import { ARTICLE_TYPES } from "@/data/article-types";
import type { TitleVariation } from "@/lib/types/generation";
import {
  Send,
  Loader2,
  AlertTriangle,
  Coins,
  Sparkles,
  Square,
} from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";
import { Slider } from "@/components/ui/Slider";
import { useMemo } from "react";
import Image from "next/image";
import { ARTICLE_TYPE_ICONS } from "@/data/article-type-icons";
import { InfoTip } from "@/components/ui/InfoTip";
import type { ArticleTypeContext } from "@/lib/services/content-generators";
import { ArticleContextSheet } from "@/components/generate/ArticleContextSheet";
import type { SavedBusinessProfile, SavedCommercialProfile } from "@/components/generate/ArticleContextSheet";

// Color palette options for components
export const COMPONENT_COLORS = [
  { id: "default", name: "Default", value: "#000000", bg: "#ffffff" },
  { id: "blue", name: "Blue", value: "#2563eb", bg: "#eff6ff" },
  { id: "green", name: "Green", value: "#16a34a", bg: "#f0fdf4" },
  { id: "amber", name: "Amber", value: "#d97706", bg: "#fffbeb" },
  { id: "red", name: "Red", value: "#dc2626", bg: "#fef2f2" },
  { id: "purple", name: "Purple", value: "#9333ea", bg: "#faf5ff" },
];

// Design variation names (from variations.ts)
export type BaseVariationName =
  | "Clean Studio"
  | "Airy Premium"
  | "Gradient Glow"
  | "Soft Stone";

export const ALL_VARIATION_NAMES: BaseVariationName[] = [
  "Clean Studio",
  "Airy Premium",
  "Gradient Glow",
  "Soft Stone",
];

// AI Provider types
export type AIProvider = "gemini" | "claude" | "openai";

export const AI_PROVIDERS: {
  id: AIProvider;
  name: string;
  description: string;
}[] = [
  { id: "gemini", name: "Gemini", description: "Google Gemini 2.5 Flash" },
  { id: "claude", name: "Claude", description: "Anthropic Claude Sonnet 4" },
  { id: "openai", name: "OpenAI", description: "OpenAI GPT-4o" },
];

// Image Provider types
export type ImageProvider = "gemini" | "flux";

export const IMAGE_PROVIDERS: {
  id: ImageProvider;
  name: string;
  description: string;
}[] = [
  { id: "flux", name: "Standard", description: "Fast and efficient" },
  { id: "gemini", name: "Premium", description: "Higher detail" },
];


// ─── GeneratorForm ──────────────────────────────────────────────────────────

interface GeneratorFormProps {
  // Values
  topic: string;
  articleType: string;
  variation: TitleVariation;
  targetWordCount: number;
  provider: AIProvider;
  enableKeywordExpansion: boolean;
  enableAutoCorrection: boolean;
  skipImages: boolean;
  imageProvider: ImageProvider;
  isGenerating: boolean;
  // Access control - allowed image providers based on user's plan
  allowedImageProviders?: ImageProvider[];
  // Credit estimation
  estimatedCredits?: number;
  userCreditBalance?: number;
  isCalculatingCredits?: boolean;

  // Handlers
  onTopicChange: (value: string) => void;
  onArticleTypeChange: (value: string) => void;
  onVariationChange: (value: TitleVariation) => void;
  onTargetWordCountChange: (value: number) => void;
  onProviderChange: (value: AIProvider) => void;
  onKeywordExpansionChange: (value: boolean) => void;
  onAutoCorrectionChange: (value: boolean) => void;
  onSkipImagesChange: (value: boolean) => void;
  onImageProviderChange: (value: ImageProvider) => void;
  onGenerate: () => void;
  onStop: () => void;
  // Article-type-specific context (local business info, commercial product info, etc.)
  articleContext: ArticleTypeContext;
  onArticleContextChange: (ctx: ArticleTypeContext) => void;
  savedBusinesses?: SavedBusinessProfile[];
  onRefreshSavedBusinesses?: () => void;
  savedCommercialProfiles?: SavedCommercialProfile[];
  onRefreshSavedCommercialProfiles?: () => void;
}

export function GeneratorForm({
  topic,
  articleType,
  variation,
  targetWordCount,
  provider,
  enableKeywordExpansion,
  enableAutoCorrection,
  skipImages,
  imageProvider,
  isGenerating,
  allowedImageProviders,
  estimatedCredits,
  userCreditBalance,
  isCalculatingCredits,
  onTopicChange,
  onArticleTypeChange,
  onVariationChange,
  onTargetWordCountChange,
  onProviderChange,
  onKeywordExpansionChange,
  onAutoCorrectionChange,
  onSkipImagesChange,
  onImageProviderChange,
  onGenerate,
  onStop,
  articleContext,
  onArticleContextChange,
  savedBusinesses,
  onRefreshSavedBusinesses,
  savedCommercialProfiles,
  onRefreshSavedCommercialProfiles,
}: GeneratorFormProps) {
  // Input validation
  const validation = useMemo(() => {
    const trimmed = topic.trim();
    const errors: string[] = [];
    const warnings: string[] = [];

    if (trimmed.length === 0) {
      errors.push("Topic is required");
    } else if (trimmed.length < 2) {
      errors.push("Topic must be at least 2 characters");
    } else if (trimmed.length > 200) {
      errors.push("Topic must be under 200 characters");
    }

    // Check for suspicious patterns
    if (/<script|javascript:|on\w+=/i.test(trimmed)) {
      errors.push("Invalid characters detected");
    }

    // Warnings
    if (trimmed.length > 100) {
      warnings.push("Long topics may produce less focused content");
    }

    if (/[^\w\s\-,.'&()]/.test(trimmed)) {
      warnings.push("Special characters may affect results");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      charCount: trimmed.length,
    };
  }, [topic]);

  const canGenerate = validation.isValid && !isGenerating;

  return (
    <div className="flex max-h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-scai-border bg-scai-card lg:w-[400px] relative">
      {/* Gradient top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-primary" />

      {/* Header */}
      <div className="flex-shrink-0 border-b border-scai-border px-6 pt-6 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-4.5 w-4.5 text-scai-page" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Article Generator</h1>
            <p className="text-xs text-scai-text-muted">
              Real-time SEO content engine
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {/* 1. Article Type — Card Grid */}
        <div data-tour="article-type">
          <label className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-scai-text-muted">
            <span className="h-1 w-1 rounded-full bg-scai-brand1" />
            Article Type
            <InfoTip text="Each format has a unique structure optimized for its purpose." />
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ARTICLE_TYPES.map((type) => {
              const isSelected = articleType === type.id;
              const icons = ARTICLE_TYPE_ICONS[type.id];
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onArticleTypeChange(type.id)}
                  disabled={isGenerating}
                  className={`group relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all duration-200 disabled:opacity-50 ${
                    isSelected
                      ? "border-scai-brand1/60 bg-scai-brand1/8 shadow-[0_0_20px_-6px_rgba(64,237,195,0.2)]"
                      : "border-scai-border bg-scai-surface hover:border-scai-border-bright hover:bg-scai-input"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-scai-brand1/5 to-transparent pointer-events-none" />
                  )}
                  {icons && (
                    <Image
                      src={isSelected ? icons.white : icons.grey}
                      alt={type.name}
                      width={22}
                      height={22}
                      className={`h-[22px] w-[22px] transition-transform duration-200 ${isSelected ? "scale-110" : "group-hover:scale-105"}`}
                    />
                  )}
                  <span
                    className={`text-[11px] font-medium transition-colors ${
                      isSelected ? "text-scai-brand1" : "text-scai-text-sec group-hover:text-scai-text"
                    }`}
                  >
                    {type.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Topic Input */}
        <div data-tour="topic-input">
          <label className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-scai-text-muted">
            <span className="h-1 w-1 rounded-full bg-scai-brand2" />
            Topic / Keyword
          </label>
          <Textarea
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            placeholder="e.g. Best wireless headphones under $100"
            rows={3}
            disabled={isGenerating}
            helperText="⌘ + Enter to generate"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) {
                onGenerate();
              }
            }}
          />
        </div>

        {/* 3. Article Context Sheet (Local, Commercial, Comparison, Review) */}
        <ArticleContextSheet
          articleType={articleType}
          articleContext={articleContext}
          onArticleContextChange={onArticleContextChange}
          isGenerating={isGenerating}
          savedBusinesses={savedBusinesses}
          onRefreshSavedBusinesses={onRefreshSavedBusinesses}
          savedCommercialProfiles={savedCommercialProfiles}
          onRefreshSavedCommercialProfiles={onRefreshSavedCommercialProfiles}
        />

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-scai-border to-transparent" />

        {/* 4. Title Format */}
        <div data-tour="title-variation">
          <label className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-scai-text-muted">
            <span className="h-1 w-1 rounded-full bg-scai-brand3" />
            Title Format
            <InfoTip text="Controls how the title is phrased: declarative, as a question, or as a numbered list." />
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["statement", "question", "listicle"] as const).map((v) => {
              const isSelected = variation === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => onVariationChange(v)}
                  disabled={isGenerating}
                  className={`py-2.5 px-3 text-sm rounded-xl border transition-all duration-200 disabled:opacity-50 ${
                    isSelected
                      ? "border-scai-brand1/60 bg-scai-brand1/8 font-medium shadow-[0_0_16px_-6px_rgba(64,237,195,0.15)]"
                      : "bg-scai-surface border-scai-border hover:border-scai-border-bright text-scai-text-sec hover:text-scai-text"
                  }`}
                >
                  <span className={isSelected ? "text-scai-brand1" : ""}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Target Word Count — Always visible slider */}
        <div data-tour="word-count">
          <label className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-scai-text-muted">
            <span className="h-1 w-1 rounded-full bg-scai-brand1" />
            Word Count
            <InfoTip text="Longer articles get more sections. Section count scales automatically." />
          </label>
          <Slider
            min={500}
            max={3000}
            step={100}
            value={[targetWordCount]}
            onValueChange={([v]) => onTargetWordCountChange(v)}
            showValue={false}
          />
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-sm font-semibold tabular-nums bg-gradient-primary bg-clip-text text-transparent">
              {targetWordCount.toLocaleString()} words
            </span>
            <span className="text-[11px] text-scai-text-muted font-mono">
              500 — 3,000
            </span>
          </div>
        </div>

        {/* 6. Image Quality — Segmented control */}
        <div data-tour="image-quality">
          <label className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-scai-text-muted">
            <span className="h-1 w-1 rounded-full bg-scai-brand2" />
            Image Quality
            <InfoTip text="Standard is faster. Premium produces higher-detail AI images." />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {IMAGE_PROVIDERS.map((p) => {
              const isSelected = imageProvider === p.id;
              const isAllowed = !allowedImageProviders || allowedImageProviders.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => isAllowed && onImageProviderChange(p.id)}
                  disabled={isGenerating || !isAllowed}
                  className={`relative py-2.5 px-4 text-sm rounded-xl border transition-all duration-200 disabled:opacity-50 ${
                    isSelected
                      ? "border-scai-brand1/60 bg-scai-brand1/8 font-medium shadow-[0_0_16px_-6px_rgba(64,237,195,0.15)]"
                      : "bg-scai-surface border-scai-border hover:border-scai-border-bright text-scai-text-sec hover:text-scai-text"
                  } ${!isAllowed ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <span className={isSelected ? "text-scai-brand1" : ""}>
                    {p.name}
                  </span>
                  {!isAllowed && (
                    <span className="ml-1.5 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Validation Feedback */}
      {topic.trim() &&
        (validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="flex-shrink-0 mx-6 mb-2 rounded-xl border border-scai-border bg-scai-surface p-3 space-y-1">
            {validation.errors.map((error, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-error"
              >
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                {error}
              </div>
            ))}
            {validation.warnings.map((warning, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-warning"
              >
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                {warning}
              </div>
            ))}
          </div>
        )}

      {/* Generate Button */}
      <div data-tour="generate-button" className="flex-shrink-0 border-t border-scai-border p-5 bg-scai-page/50">
        {/* Credit estimate badge */}
        {estimatedCredits !== undefined && userCreditBalance !== undefined && (
          <div data-tour="credit-estimate" className="mb-3 flex items-center justify-between rounded-xl bg-scai-surface border border-scai-border-dim px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm text-scai-text-sec">
              {isCalculatingCredits ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-scai-brand1" />
              ) : (
                <Coins className="h-3.5 w-3.5 text-scai-brand1" />
              )}
              <span className="text-xs">
                {isCalculatingCredits ? "Estimating..." : `~${estimatedCredits} credits`}
              </span>
            </div>
            <div className={`text-xs font-semibold tabular-nums ${
              userCreditBalance >= estimatedCredits
                ? "text-scai-brand1"
                : userCreditBalance > 0
                  ? "text-amber-500"
                  : "text-error"
            }`}>
              {userCreditBalance.toLocaleString()} available
            </div>
          </div>
        )}
        {!isGenerating ? (
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="group relative flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-primary py-3.5 font-semibold text-scai-page shadow-glow transition-all duration-200 hover:shadow-glow-lg hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-glow"
          >
            <Send className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            Generate Article
          </button>
        ) : (
          <button
            onClick={onStop}
            className="group flex w-full items-center justify-center gap-2.5 rounded-xl border border-error/30 bg-error/10 py-3.5 font-semibold text-error transition-all duration-200 hover:bg-error/15 hover:border-error/40"
          >
            <Square className="h-4 w-4 fill-current" />
            Stop Generation
          </button>
        )}
        {/* Character count */}
        {topic.trim() && (
          <p
            className={`text-[11px] mt-2.5 text-center font-mono ${
              validation.charCount > 150
                ? "text-warning"
                : "text-scai-text-muted"
            }`}
          >
            {validation.charCount}/200
          </p>
        )}
      </div>
    </div>
  );
}
