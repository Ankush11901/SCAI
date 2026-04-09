"use client";

import { useRef, useMemo } from "react";
import { ARTICLE_TYPES } from "@/data/article-types";
import {
  Play,
  Loader2,
  FileText,
  Upload,
  Trash2,
  Layers,
  ListPlus,
  Coins,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  estimateBulkCredits,
  type ImageProvider as CreditImageProvider,
} from "@/lib/services/credit-estimator";
import { DEFAULT_WORD_COUNT_BY_TYPE } from "@/lib/ai/word-counts";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import {
  IMAGE_PROVIDERS,
  type ImageProvider,
} from "@/components/generate/GeneratorForm";
import { InfoTip } from "@/components/ui/InfoTip";

export type GenerationMode = "single" | "csv";
export type TitleVariation = "question" | "statement" | "listicle";

export interface CSVRow {
  keyword: string;
  articleType: string;
}

interface BulkGeneratorFormProps {
  mode: GenerationMode;
  keyword: string;
  variations: TitleVariation[];
  csvData: CSVRow[];
  isRunning: boolean;
  isStarting: boolean;
  hasRunningJob: boolean;
  canStart: boolean;
  imageProvider: ImageProvider;
  allowedImageProviders?: ImageProvider[];
  onModeChange: (mode: GenerationMode) => void;
  onKeywordChange: (value: string) => void;
  onVariationsChange: (values: TitleVariation[]) => void;
  onCSVUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCSVClear: () => void;
  onImageProviderChange: (value: ImageProvider) => void;
  onStart: () => void;
  onStop: () => void;
}

export function BulkGeneratorForm({
  mode,
  keyword,
  variations,
  csvData,
  isRunning,
  isStarting,
  hasRunningJob,
  canStart,
  onModeChange,
  onKeywordChange,
  onVariationsChange,
  onCSVUpload,
  onCSVClear,
  imageProvider,
  allowedImageProviders,
  onImageProviderChange,
  onStart,
  onStop,
}: BulkGeneratorFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form inputs are disabled only when starting, not when running
  // This allows users to add to queue while a job is running
  const inputsDisabled = isStarting;

  // Map form image provider to credit estimator provider
  const creditImageProvider: CreditImageProvider = useMemo(() => {
    if (imageProvider.startsWith("gemini") || imageProvider.startsWith("imagen")) return "gemini";
    if (imageProvider.startsWith("flux")) return "flux";
    return "flux";
  }, [imageProvider]);

  // Total articles based on mode and variations
  const totalArticles = useMemo(() => {
    if (mode === "single") {
      return ARTICLE_TYPES.length * variations.length;
    }
    return csvData.length * variations.length;
  }, [mode, csvData, variations]);

  // Estimate credits for the current form state (accounts for multiple variations)
  const creditEstimate = useMemo(() => {
    const articles = mode === "single"
      ? ARTICLE_TYPES.flatMap((t) => 
          variations.map(() => ({ 
            wordCount: DEFAULT_WORD_COUNT_BY_TYPE[t.id] ?? 1000, 
            imageProvider: creditImageProvider, 
            articleType: t.id 
          }))
        )
      : csvData.flatMap((row) => 
          variations.map(() => ({ 
            wordCount: DEFAULT_WORD_COUNT_BY_TYPE[row.articleType] ?? 1000, 
            imageProvider: creditImageProvider, 
            articleType: row.articleType 
          }))
        );
    if (articles.length === 0) return null;
    return estimateBulkCredits(articles);
  }, [mode, csvData, creditImageProvider, variations]);

  // Toggle a variation in the selection
  const toggleVariation = (v: TitleVariation) => {
    if (variations.includes(v)) {
      // Don't allow deselecting last variation
      if (variations.length > 1) {
        onVariationsChange(variations.filter(x => x !== v));
      }
    } else {
      onVariationsChange([...variations, v]);
    }
  };

  // Select all variations
  const selectAllVariations = () => {
    onVariationsChange(["question", "statement", "listicle"]);
  };

  // Clear to single variation (statement default)
  const selectSingleVariation = () => {
    onVariationsChange(["statement"]);
  };

  return (
    <div className="flex max-h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-xl border border-scai-border bg-scai-card lg:w-[380px]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-scai-border p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Layers className="w-5 h-5 text-scai-page" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Bulk Generator</h1>
            <p className="text-sm text-scai-text-sec">
              Generate multiple articles at once
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* Mode Toggle */}
        <div>
          <label className="mb-2 block text-sm font-medium text-scai-text-sec">
            Generation Mode
            <InfoTip text="Single keyword generates all 9 types. CSV lets you specify keyword-type pairs." />
          </label>
          <div className="flex bg-scai-input rounded-lg p-1">
            <button
              onClick={() => !inputsDisabled && onModeChange("single")}
              disabled={inputsDisabled}
              className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                mode === "single"
                  ? "bg-scai-brand1 text-scai-page"
                  : "text-scai-text-sec hover:text-scai-text"
              } disabled:opacity-50`}
            >
              <FileText className="w-4 h-4" />
              Single Keyword
            </button>
            <button
              onClick={() => !inputsDisabled && onModeChange("csv")}
              disabled={inputsDisabled}
              className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                mode === "csv"
                  ? "bg-scai-brand1 text-scai-page"
                  : "text-scai-text-sec hover:text-scai-text"
              } disabled:opacity-50`}
            >
              <Upload className="w-4 h-4" />
              CSV Upload
            </button>
          </div>
        </div>

        {mode === "single" ? (
          <>
            {/* Keyword Input */}
            <div>
              <Textarea
                label="Keyword / Topic"
                value={keyword}
                onChange={(e) => onKeywordChange(e.target.value)}
                placeholder="e.g., wireless headphones, meal prep, hiking boots"
                rows={3}
                disabled={inputsDisabled}
                helperText={hasRunningJob
                  ? "Enter a keyword to add to the queue"
                  : "All 9 article types will be generated for this keyword"}
              />
            </div>

            {/* Title Variations (Checkboxes) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-scai-text-sec">
                  Title Variations
                  <InfoTip text="More styles selected means more articles generated per keyword." />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllVariations}
                    disabled={inputsDisabled || variations.length === 3}
                    className="text-xs text-scai-brand1 hover:text-scai-brand2 disabled:opacity-50"
                  >
                    All
                  </button>
                  <span className="text-scai-text-muted">|</span>
                  <button
                    type="button"
                    onClick={selectSingleVariation}
                    disabled={inputsDisabled || (variations.length === 1 && variations[0] === "statement")}
                    className="text-xs text-scai-text-muted hover:text-scai-text disabled:opacity-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {(["question", "statement", "listicle"] as const).map((v) => {
                  const isSelected = variations.includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggleVariation(v)}
                      disabled={inputsDisabled}
                      className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all border ${
                        isSelected
                          ? "bg-scai-brand1/10 text-scai-brand1 border-scai-brand1/30"
                          : "bg-scai-input border-scai-border hover:border-scai-brand1/50 text-scai-text-sec"
                      } disabled:opacity-50`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      <span>{v.charAt(0).toUpperCase() + v.slice(1)}</span>
                      <span className="ml-auto text-xs text-scai-text-muted">
                        {v === "question" && "Who, What, Why, How..."}
                        {v === "statement" && "Direct title format"}
                        {v === "listicle" && "X Best, Top Y..."}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-scai-text-muted">
                {variations.length === 3 
                  ? `All variations selected · ${ARTICLE_TYPES.length * 3} articles will be generated`
                  : `${variations.length} variation${variations.length > 1 ? 's' : ''} selected · ${ARTICLE_TYPES.length * variations.length} articles`
                }
              </p>
            </div>
          </>
        ) : (
          /* CSV Upload Section */
          <div>
            {csvData.length === 0 ? (
              <div className="border-2 border-dashed border-scai-border rounded-xl p-6 text-center">
                <Upload className="w-10 h-10 text-scai-text-muted mx-auto mb-3" />
                <h3 className="font-semibold mb-1.5">Upload CSV File</h3>
                <p className="text-sm text-scai-text-sec mb-4">
                  Format: keyword,articleType (one per line)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={onCSVUpload}
                  className="hidden"
                  id="csv-upload"
                  title="Upload CSV file"
                  aria-label="Upload CSV file"
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <p className="text-xs text-scai-text-muted mt-4">
                  Valid types: {ARTICLE_TYPES.map((t) => t.id).join(", ")}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">
                    {csvData.length} rows loaded
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCSVClear}
                    disabled={inputsDisabled}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>
                <div className="max-h-48 overflow-auto border border-scai-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-scai-surface sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium text-scai-text-sec">
                          #
                        </th>
                        <th className="text-left p-2 font-medium text-scai-text-sec">
                          Keyword
                        </th>
                        <th className="text-left p-2 font-medium text-scai-text-sec">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.map((row, index) => (
                        <tr key={index} className="border-t border-scai-border">
                          <td className="p-2 text-scai-text-muted">
                            {index + 1}
                          </td>
                          <td className="p-2 truncate max-w-[120px]">
                            {row.keyword}
                          </td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 bg-scai-brand1/10 text-scai-brand1 text-xs rounded">
                              {row.articleType}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image Quality — Segmented control */}
        <div>
          <label className="mb-2 block text-sm font-medium text-scai-text-sec">
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
                  disabled={inputsDisabled || !isAllowed}
                  className={`relative py-2.5 px-4 text-sm rounded-lg border transition-all disabled:opacity-50 ${
                    isSelected
                      ? "border-scai-brand1 bg-scai-brand1/10 font-medium"
                      : "bg-scai-surface border-scai-border hover:border-scai-border-bright text-scai-text-sec hover:text-scai-text"
                  } ${!isAllowed ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <span className={isSelected ? "text-scai-brand1" : ""}>
                    {p.name}
                  </span>
                  {!isAllowed && (
                    <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                      Upgrade
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Credit Estimate */}
      {creditEstimate && creditEstimate.totalCredits > 0 && (
        <div className="flex-shrink-0 mx-5 mb-0 p-3 rounded-lg bg-scai-surface border border-scai-border">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-3.5 h-3.5 text-scai-brand2" />
            <span className="text-xs font-medium text-scai-text-sec">Estimated Cost</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-scai-text tabular-nums">
              ~{creditEstimate.totalCredits.toLocaleString()}
            </span>
            <span className="text-xs text-scai-text-muted">
              credits ({totalArticles} articles, ~{creditEstimate.averageCredits} avg)
            </span>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div className="flex-shrink-0 border-t border-scai-border p-5">
        {isStarting ? (
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3.5 font-semibold text-scai-page opacity-70"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            {hasRunningJob ? "Adding to Queue..." : "Starting..."}
          </button>
        ) : hasRunningJob ? (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3.5 font-semibold text-scai-page shadow-glow transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ListPlus className="w-5 h-5" />
            Add {totalArticles} Articles to Queue
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={!canStart || variations.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3.5 font-semibold text-scai-page shadow-glow transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="w-5 h-5" />
            Generate {totalArticles} Articles
          </button>
        )}
      </div>
    </div>
  );
}
