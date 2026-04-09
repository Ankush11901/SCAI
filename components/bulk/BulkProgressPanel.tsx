"use client";

import { useState } from "react";
import {
  Loader2,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  LayoutGrid,
  RefreshCw,
  Trash2,
  Layers,
  Monitor,
  Tablet,
  Smartphone,
  StopCircle,
  ClipboardCheck,
  AlertTriangle,
  Copy,
  Check,
  RefreshCcw,
  FileText,
  Hash,
  Grid3X3,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { IsolatedArticlePreview } from "@/components/article/IsolatedArticlePreview";
import { type ArticleProgress } from "./BulkArticleCard";
import { ARTICLE_TYPES } from "@/data/article-types";
import {
  validateArticle,
  type ValidationResult,
} from "@/lib/services/article-validator";

type ViewMode = "grid" | "preview" | "validate";
type ViewportSize = "desktop" | "tablet" | "mobile";

const VIEWPORT_SIZES: Record<ViewportSize, { width: string; label: string }> = {
  desktop: { width: "100%", label: "Desktop" },
  tablet: { width: "768px", label: "Tablet" },
  mobile: { width: "375px", label: "Mobile" },
};

export interface BulkStats {
  completed: number;
  failed: number;
  pending: number;
  generating: number;
  total: number;
  avgProgress: number;
}

interface BulkProgressPanelProps {
  articles: ArticleProgress[];
  stats: BulkStats;
  isRunning: boolean;
  elapsedTime?: number;
  showKeywords: boolean;
  showValidation?: boolean;
  onSelectArticle: (article: ArticleProgress) => void;
  onRetryArticle: (articleId: string) => void;
  onRetryAllFailed: () => void;
  onDownloadSingle: (article: ArticleProgress) => void;
  onDownloadAll: () => void;
  onGenerateQAExport?: () => void;
  isExportingQA?: boolean;
  onClear: () => void;
  onCancel?: () => void;
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function BulkProgressPanel({
  articles,
  stats,
  isRunning,
  elapsedTime,
  showKeywords,
  showValidation = false,
  onSelectArticle,
  onRetryArticle,
  onRetryAllFailed,
  onDownloadSingle,
  onDownloadAll,
  onGenerateQAExport,
  isExportingQA = false,
  onClear,
  onCancel,
}: BulkProgressPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedArticle, setSelectedArticle] =
    useState<ArticleProgress | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handlePreview = (article: ArticleProgress) => {
    setSelectedArticle(article);
    setViewMode("preview");
    setValidationResult(null);
  };

  const handleValidate = (article: ArticleProgress) => {
    setSelectedArticle(article);
    setViewMode("validate");
    runValidation(article);
  };

  const runValidation = (article: ArticleProgress) => {
    if (!article.html) return;
    setIsValidating(true);
    // Use setTimeout to prevent UI blocking
    setTimeout(() => {
      const result = validateArticle(
        article.html!,
        article.articleType || "informational",
        article.variation || "statement",
        article.keyword
      );
      setValidationResult(result);
      setIsValidating(false);
    }, 0);
  };

  const handleRevalidate = () => {
    if (selectedArticle) {
      runValidation(selectedArticle);
    }
  };

  const handleBackToGrid = () => {
    setSelectedArticle(null);
    setViewMode("grid");
    setValidationResult(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-scai-border bg-scai-card">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-scai-border p-4">
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg bg-scai-input p-1">
            <button
              onClick={() => {
                setViewMode("grid");
                setSelectedArticle(null);
                setValidationResult(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-scai-card shadow-sm text-scai-text"
                  : "text-scai-text-sec hover:text-scai-text"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setViewMode("preview")}
              disabled={!selectedArticle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "preview"
                  ? "bg-scai-card shadow-sm text-scai-text"
                  : "text-scai-text-sec hover:text-scai-text"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            {showValidation && (
              <button
                onClick={() => {
                  if (selectedArticle) {
                    setViewMode("validate");
                    runValidation(selectedArticle);
                  }
                }}
                disabled={!selectedArticle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === "validate"
                    ? "bg-scai-card shadow-sm text-scai-text"
                    : "text-scai-text-sec hover:text-scai-text"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ClipboardCheck className="h-4 w-4" />
                Validate
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport toggles - only show in preview mode */}
          {viewMode === "preview" && selectedArticle && (
            <div className="flex items-center rounded-lg bg-scai-input p-1">
              {(Object.keys(VIEWPORT_SIZES) as ViewportSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setViewport(size)}
                  className={`p-2 rounded-md transition-all ${
                    viewport === size
                      ? "bg-scai-card shadow-sm text-scai-text"
                      : "text-scai-text-sec hover:text-scai-text"
                  }`}
                  title={VIEWPORT_SIZES[size].label}
                >
                  {size === "desktop" && <Monitor className="h-4 w-4" />}
                  {size === "tablet" && <Tablet className="h-4 w-4" />}
                  {size === "mobile" && <Smartphone className="h-4 w-4" />}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          {isRunning && onCancel && (
            <Button variant="secondary" size="sm" onClick={onCancel} className="text-error hover:bg-error/10">
              <StopCircle className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
          {stats.failed > 0 && !isRunning && (
            <Button variant="secondary" size="sm" onClick={onRetryAllFailed}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry Failed
            </Button>
          )}
          {stats.completed > 0 && !isRunning && (
            <Button variant="primary" size="sm" onClick={onDownloadAll}>
              <Download className="w-4 h-4 mr-1" />
              Download All ({stats.completed})
            </Button>
          )}
          {stats.completed > 0 && !isRunning && onGenerateQAExport && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onGenerateQAExport}
              disabled={isExportingQA}
            >
              {isExportingQA ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Grid3X3 className="w-4 h-4 mr-1" />
              )}
              Export QA Matrix
            </Button>
          )}
          {articles.length > 0 && !isRunning && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {articles.length > 0 && (
        <div className="flex-shrink-0 border-b border-scai-border bg-scai-surface px-4 py-2 flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm">
            <CheckCircle className="w-4 h-4 text-success" />
            {stats.completed} complete
          </span>
          {stats.failed > 0 && (
            <span className="flex items-center gap-1.5 text-sm">
              <XCircle className="w-4 h-4 text-error" />
              {stats.failed} failed
            </span>
          )}
          {stats.generating > 0 && (
            <span className="flex items-center gap-1.5 text-sm">
              <Loader2 className="w-4 h-4 text-scai-brand1 animate-spin" />
              {stats.generating} in progress
            </span>
          )}
          {stats.pending > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-scai-text-muted">
              <Clock className="w-4 h-4" />
              {stats.pending} pending
            </span>
          )}
          {elapsedTime !== undefined && elapsedTime > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-scai-text-sec">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(elapsedTime)}</span>
            </span>
          )}
          {selectedArticle && (viewMode === "preview" || viewMode === "validate") && (
            <span className="ml-auto text-sm text-scai-text-sec">
              {viewMode === "preview" ? "Previewing" : "Validating"}:{" "}
              {selectedArticle.name}
              {selectedArticle.wordCount &&
                ` (${selectedArticle.wordCount.toLocaleString()} words)`}
            </span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {isRunning && (
        <div className="h-1 bg-scai-input flex-shrink-0">
          <motion.div
            className="h-full bg-gradient-primary"
            initial={{ width: 0 }}
            animate={{ width: `${stats.avgProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto bg-scai-surface p-4">
        {articles.length === 0 ? (
          /* Empty State */
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-2xl bg-scai-input flex items-center justify-center mx-auto mb-6">
                <Layers className="w-10 h-10 text-scai-text-muted" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Ready for Bulk Generation
              </h3>
              <p className="text-scai-text-sec">
                Enter a keyword to generate all 9 article types, or upload a CSV
                for batch processing with custom keyword-type pairs.
              </p>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          /* Table View */
          <div className="bg-scai-card border border-scai-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-scai-surface border-b border-scai-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-scai-text-sec uppercase tracking-wide w-28">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-scai-text-sec uppercase tracking-wide">
                      Topic
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-scai-text-sec uppercase tracking-wide">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-scai-text-sec uppercase tracking-wide">
                      Words
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-scai-text-sec uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-scai-text-sec uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-scai-border">
                  {articles.map((article) => (
                    <motion.tr
                      key={article.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-scai-surface/50 transition-colors"
                    >
                      {/* Priority */}
                      <td className="px-4 py-3">
                        {article.priority === 1 ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20 whitespace-nowrap">
                            Parent Topic
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-scai-surface text-scai-text-muted border-scai-border whitespace-nowrap">
                            Sub Topic
                          </span>
                        )}
                      </td>

                      {/* Article Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-scai-text-muted flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="font-medium text-sm truncate block max-w-[250px]">
                              {article.name}
                            </span>
                            {showKeywords && article.keyword && (
                              <span className="text-xs text-scai-text-muted truncate block max-w-[250px]">
                                {article.keyword}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 text-sm text-scai-text-sec">
                        {article.articleType
                          ? ARTICLE_TYPES.find((t) => t.id === article.articleType)?.name || article.articleType
                          : "-"}
                      </td>

                      {/* Words */}
                      <td className="px-4 py-3 text-sm text-scai-text-sec">
                        {article.wordCount ? (
                          <div className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {article.wordCount.toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-scai-text-muted">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {article.status === "generating" ? (
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-scai-input rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-primary rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${article.progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                            <span className="text-xs text-scai-brand1 font-medium">
                              {article.progress}%
                            </span>
                          </div>
                        ) : (
                          <StatusBadge status={article.status} />
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {article.status === "complete" && article.html && (
                            <>
                              <button
                                onClick={() => handlePreview(article)}
                                className="p-1.5 rounded-lg text-scai-text-sec hover:text-scai-brand1 hover:bg-scai-brand1/10 transition-colors"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {showValidation && (
                                <button
                                  onClick={() => handleValidate(article)}
                                  className="p-1.5 rounded-lg text-scai-text-sec hover:text-scai-brand1 hover:bg-scai-brand1/10 transition-colors"
                                  title="Validate"
                                >
                                  <ClipboardCheck className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => onDownloadSingle(article)}
                                className="p-1.5 rounded-lg text-scai-text-sec hover:text-scai-brand1 hover:bg-scai-brand1/10 transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {article.status === "error" && (
                            <>
                              <span
                                className="text-xs text-red-500 max-w-[150px] truncate"
                                title={article.error}
                              >
                                {article.error}
                              </span>
                              {!isRunning && (
                                <button
                                  onClick={() => onRetryArticle(article.id)}
                                  className="p-1.5 rounded-lg text-scai-text-sec hover:text-scai-brand1 hover:bg-scai-brand1/10 transition-colors"
                                  title="Retry"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewMode === "validate" ? (
          /* Validation View */
          <BulkValidationView
            validationResult={validationResult}
            isValidating={isValidating}
            selectedArticle={selectedArticle}
            onRevalidate={handleRevalidate}
            onBackToGrid={handleBackToGrid}
          />
        ) : (
          /* Preview View */
          <div className="h-full">
            {selectedArticle?.html ? (
              <div
                className="mx-auto h-full overflow-hidden rounded-xl bg-white shadow-lg transition-all duration-300"
                style={{
                  width: VIEWPORT_SIZES[viewport].width,
                  maxWidth: "100%",
                }}
              >
                {/* Browser chrome */}
                <div className="flex items-center gap-2 border-b border-scai-border bg-scai-input px-4 py-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-block rounded-md bg-scai-card px-4 py-1 text-xs text-scai-text-muted">
                      {selectedArticle.name.toLowerCase().replace(/\s+/g, "-")}
                      .article.preview
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBackToGrid}
                      className="text-xs text-scai-text-sec hover:text-scai-text px-2 py-1 rounded hover:bg-scai-surface transition-colors"
                    >
                      Back to List
                    </button>
                    <button
                      onClick={() => onDownloadSingle(selectedArticle)}
                      className="text-xs text-scai-brand1 hover:text-scai-brand1/80 px-2 py-1 rounded hover:bg-scai-surface transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Iframe preview */}
                <IsolatedArticlePreview
                  html={selectedArticle.html}
                  className="h-[calc(100%-40px)] w-full"
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 rounded-2xl bg-scai-input flex items-center justify-center mx-auto mb-6">
                    <Eye className="w-10 h-10 text-scai-text-muted" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    No Article Selected
                  </h3>
                  <p className="text-scai-text-sec mb-4">
                    Click the preview icon on a completed article to view it
                    here.
                  </p>
                  <Button variant="secondary" onClick={handleBackToGrid}>
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Back to List
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge Component
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    complete: "bg-green-500/10 text-green-500 border-green-500/20",
    generating: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    error: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const labels: Record<string, string> = {
    complete: "Completed",
    generating: "Generating",
    pending: "Pending",
    error: "Failed",
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
        colors[status] || colors.pending
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Validation View Component
// ─────────────────────────────────────────────────────────────────────────────

interface BulkValidationViewProps {
  validationResult: ValidationResult | null;
  isValidating: boolean;
  selectedArticle: ArticleProgress | null;
  onRevalidate: () => void;
  onBackToGrid: () => void;
}

function BulkValidationView({
  validationResult,
  isValidating,
  selectedArticle,
  onRevalidate,
  onBackToGrid,
}: BulkValidationViewProps) {
  const [copied, setCopied] = useState(false);

  // Format validation result as text for copying
  const formatValidationAsText = () => {
    if (!validationResult || !selectedArticle) return "";

    let text = `# Article Validation Report\n\n`;
    text += `**Article:** ${selectedArticle.name}\n`;
    text += `**Score:** ${validationResult.score}%\n`;
    text += `**Status:** ${validationResult.score >= 80 ? "Good Compliance" : validationResult.score >= 60 ? "Needs Improvement" : "Poor Compliance"}\n`;
    text += `**Rules Passed:** ${validationResult.totalPassed}/${validationResult.totalRules}\n\n`;
    text += `**Article Type:** ${selectedArticle.articleType || "informational"}\n`;
    text += `**Keyword:** ${selectedArticle.keyword || "N/A"}\n\n`;
    text += `---\n\n`;

    for (const category of validationResult.categories) {
      text += `## ${category.label} (${category.passed}/${category.total})\n\n`;

      for (const rule of category.rules) {
        const statusIcon =
          rule.status === "pass" ? "✅" : rule.status === "warn" ? "⚠️" : "❌";
        text += `${statusIcon} **${rule.name}**\n`;
        text += `   - Expected: ${rule.expected}\n`;
        text += `   - Actual: ${rule.actual}\n`;
        if (rule.status !== "pass" && rule.message) {
          text += `   - Issue: ${rule.message}\n`;
        }
        text += `\n`;
      }
    }

    return text;
  };

  const handleCopy = async () => {
    const text = formatValidationAsText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isValidating) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-scai-brand1 animate-spin mx-auto mb-4" />
          <p className="text-scai-text-sec">Validating article...</p>
        </div>
      </div>
    );
  }

  if (!selectedArticle || !selectedArticle.html) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-scai-input flex items-center justify-center mx-auto mb-6">
            <ClipboardCheck className="w-10 h-10 text-scai-text-muted" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Article Selected</h3>
          <p className="text-scai-text-sec mb-4">
            Click the validate icon on a completed article to see its
            compliance report.
          </p>
          <Button variant="secondary" onClick={onBackToGrid}>
            <LayoutGrid className="w-4 h-4 mr-2" />
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  if (!validationResult) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="text-center py-12">
          <ClipboardCheck className="w-12 h-12 text-scai-text-muted mx-auto mb-4" />
          <p className="text-scai-text-sec">
            Generate an article first to validate it
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Score Header */}
        <div className="bg-scai-card border border-scai-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Compliance Report</h3>
              <p className="text-sm text-scai-text-sec mt-1">
                {selectedArticle.name}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={handleCopy}
                className="text-sm text-scai-text-sec hover:text-scai-text flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-scai-border hover:border-scai-brand1/50 transition-all whitespace-nowrap"
                title="Copy validation report"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Report
                  </>
                )}
              </button>
              <button
                onClick={onRevalidate}
                className="text-sm text-scai-brand1 hover:underline flex items-center gap-1 transition-all whitespace-nowrap"
              >
                <RefreshCcw className="w-3 h-3" />
                Re-validate
              </button>
              <button
                onClick={onBackToGrid}
                className="text-sm text-scai-text-sec hover:text-scai-text px-2 py-1 rounded hover:bg-scai-surface transition-colors whitespace-nowrap"
              >
                Back to List
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Score Circle */}
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold border-4 ${
                validationResult.score >= 80
                  ? "border-green-500 text-green-500 bg-green-500/10"
                  : validationResult.score >= 60
                    ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                    : "border-red-500 text-red-500 bg-red-500/10"
              }`}
            >
              {validationResult.score}%
            </div>

            <div>
              <p
                className={`text-lg font-medium ${
                  validationResult.score >= 80
                    ? "text-green-400"
                    : validationResult.score >= 60
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {validationResult.score >= 90
                  ? "✅ Excellent Compliance"
                  : validationResult.score >= 80
                    ? "✅ Good Compliance"
                    : validationResult.score >= 60
                      ? "⚠️ Needs Improvement"
                      : "❌ Poor Compliance"}
              </p>
              <p className="text-sm text-scai-text-sec mt-1">
                {validationResult.totalPassed}/{validationResult.totalRules}{" "}
                rules passed
              </p>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {validationResult.categories.map((category) => (
          <div
            key={category.category}
            className="bg-scai-card border border-scai-border rounded-xl overflow-hidden"
          >
            <div className="px-4 py-3 bg-scai-surface border-b border-scai-border flex items-center justify-between">
              <h4 className="font-medium">{category.label}</h4>
              <span
                className={`text-sm ${
                  category.passed === category.total
                    ? "text-green-400"
                    : category.passed >= category.total / 2
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {category.passed}/{category.total} passed
              </span>
            </div>

            <div className="divide-y divide-scai-border">
              {category.rules.map((rule) => (
                <div key={rule.id} className="px-4 py-3 flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="mt-0.5">
                    {rule.status === "pass" && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {rule.status === "warn" && (
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    )}
                    {rule.status === "fail" && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>

                  {/* Rule Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{rule.name}</span>
                    </div>
                    <div className="text-xs text-scai-text-sec mt-1 space-y-0.5">
                      <p>
                        <span className="text-scai-text-muted">Expected:</span>{" "}
                        {rule.expected}
                      </p>
                      <p>
                        <span className="text-scai-text-muted">Actual:</span>{" "}
                        {rule.actual}
                      </p>
                      {rule.status !== "pass" && rule.message && (
                        <p
                          className={
                            rule.status === "fail"
                              ? "text-red-400"
                              : "text-yellow-400"
                          }
                        >
                          {rule.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
