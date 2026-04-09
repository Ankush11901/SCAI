"use client";

import {
  useRef,
  useEffect,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { ARTICLE_TYPES } from "@/data/article-types";
import type { GenerationState } from "@/lib/hooks/useArticleGeneration";
import type {
  TitleVariation,
  ValidationIssue,
  ValidationSummary,
} from "@/lib/types/generation";
import {
  validateArticle,
  type ValidationResult,
} from "@/lib/services/article-validator";
import {
  Loader2,
  Download,
  Upload,
  RefreshCcw,
  FileCode,
  Eye,
  Code,
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Monitor,
  Tablet,
  Smartphone,
  Copy,
  Check,
  Sparkles,
  Clock,
} from "lucide-react";
import { sanitizeFilename } from "@/lib/utils/article-export";
import {
  IsolatedArticlePreview,
  type IsolatedArticlePreviewRef,
} from "@/components/article/IsolatedArticlePreview";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { CMSExportDialog } from "@/components/cms/CMSExportDialog";
import { useWordPressConnections } from "@/lib/hooks/queries";
import { GenerationWarmup } from "@/components/generate/GenerationWarmup";

export type ViewMode = "preview" | "code" | "validate";
type ViewportSize = "desktop" | "tablet" | "mobile";

const VIEWPORT_SIZES: Record<ViewportSize, { width: string; label: string }> = {
  desktop: { width: "100%", label: "Desktop" },
  tablet: { width: "768px", label: "Tablet" },
  mobile: { width: "375px", label: "Mobile" },
};

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

export interface ScaiValidationResult {
  isValid: boolean;
  score: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: ValidationSummary;
}

interface ArticlePreviewProps {
  state: GenerationState;
  topic: string;
  articleType: string;
  variation: TitleVariation;
  onReset: () => void;
  validation?: ScaiValidationResult;
  showValidation?: boolean;
  elapsedTime?: number;
}

export interface ArticlePreviewRef {
  scrollToBottom: () => void;
}

export const ArticlePreview = forwardRef<
  ArticlePreviewRef,
  ArticlePreviewProps
>(function ArticlePreview(
  {
    state,
    topic,
    articleType,
    variation,
    onReset,
    validation: scaiValidation,
    showValidation = true,
    elapsedTime,
  },
  ref,
) {
  const isolatedPreviewRef = useRef<IsolatedArticlePreviewRef>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [copiedType, setCopiedType] = useState<"html" | "css" | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  // No longer blocking the button visibility by connections to allow user to see available platforms

  // Expose scroll method
  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      isolatedPreviewRef.current?.scrollToBottom();
    },
  }));


  // Auto-validate after generation completes (always re-validate on complete)
  useEffect(() => {
    if (state.status === "complete" && state.html) {
      // Always re-validate when generation completes to capture corrections
      setValidationResult(
        validateArticle(
          state.html,
          articleType,
          variation,
          topic,
          state.coreKeywords, // Pass extracted keywords for natural density validation
        ),
      );
    }
  }, [
    state.status,
    state.html,
    articleType,
    variation,
    topic,
    state.coreKeywords,
  ]);

  // Reset validation when generation starts
  useEffect(() => {
    if (state.status === "generating") {
      setValidationResult(null);
    }
  }, [state.status]);

  // Update validation when scaiValidation changes (from orchestrator corrections)
  useEffect(() => {
    if (scaiValidation && state.html && state.status !== "generating") {
      // Re-run full validation to get detailed results after corrections
      setValidationResult(
        validateArticle(
          state.html,
          articleType,
          variation,
          topic,
          state.coreKeywords,
        ),
      );
      // Auto-switch to validation tab when validation results are received (only if validation is shown)
      if (state.status === "complete" && showValidation) {
        setViewMode("validate");
      }
    }
  }, [
    scaiValidation,
    state.html,
    articleType,
    variation,
    topic,
    state.status,
    showValidation,
  ]);


  // Handle download
  // state.html is already a complete HTML document from article-assembler
  // so we download it directly without re-wrapping
  const handleDownload = () => {
    if (!state.html) return;

    // state.html is already a complete HTML document with embedded styles
    const blob = new Blob([state.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${articleType}-${sanitizeFilename(topic)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Memoized extraction of styles and content - only recalculates when html changes
  // This prevents expensive regex operations on every render (fixes slow code tab)
  const { styles: extractedStyles, content: extractedContent } = useMemo(() => {
    if (!state.html) return { styles: "", content: "" };

    // Extract <style> tag content (use greedy to get all styles)
    const styleMatch = state.html.match(/<style>([\s\S]*)<\/style>/i);
    const styles = styleMatch ? styleMatch[1] : "";

    // Extract <article> content using greedy matching
    const articleMatch = state.html.match(
      /<article[^>]*>([\s\S]*)<\/article>/i,
    );
    const bodyMatch = state.html.match(/<body[^>]*>([\s\S]*)<\/body>/i);

    const content = articleMatch
      ? articleMatch[0]
      : bodyMatch
        ? bodyMatch[1]
        : state.html;

    return { styles, content };
  }, [state.html]);

  // Handle copy
  const handleCopy = async (type: "html" | "css") => {
    if (!state.html) return;

    const text = type === "html" ? extractedContent : extractedStyles;
    await navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Get content to display based on status
  const getDisplayContent = () => {
    if (state.status === "generating") {
      return state.displayedHtml;
    }
    return state.html;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-scai-border bg-scai-card relative">
      {/* Preview Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-scai-border px-5 py-3">
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center rounded-xl bg-scai-surface border border-scai-border-dim p-1">
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === "preview"
                  ? "bg-scai-card shadow-sm text-scai-text border border-scai-border-dim"
                  : "text-scai-text-muted hover:text-scai-text-sec border border-transparent"
                }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
            <button
              onClick={() => setViewMode("code")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === "code"
                  ? "bg-scai-card shadow-sm text-scai-text border border-scai-border-dim"
                  : "text-scai-text-muted hover:text-scai-text-sec border border-transparent"
                }`}
            >
              <Code className="h-3.5 w-3.5" />
              Code
            </button>
            {showValidation && (
              <button
                onClick={() => {
                  setViewMode("validate");
                  if (state.html && !validationResult) {
                    setValidationResult(
                      validateArticle(
                        state.html,
                        articleType,
                        variation,
                        topic,
                        state.coreKeywords,
                      ),
                    );
                  }
                }}
                disabled={!state.html}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === "validate"
                    ? "bg-scai-card shadow-sm text-scai-text border border-scai-border-dim"
                    : "text-scai-text-muted hover:text-scai-text-sec border border-transparent"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Validate
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport toggles - only show in preview mode */}
          {viewMode === "preview" && (
            <div className="flex items-center rounded-xl bg-scai-surface border border-scai-border-dim p-1">
              {(Object.keys(VIEWPORT_SIZES) as ViewportSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setViewport(size)}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${viewport === size
                      ? "bg-scai-card shadow-sm text-scai-text border border-scai-border-dim"
                      : "text-scai-text-muted hover:text-scai-text-sec border border-transparent"
                    }`}
                  title={VIEWPORT_SIZES[size].label}
                >
                  {size === "desktop" && <Monitor className="h-3.5 w-3.5" />}
                  {size === "tablet" && <Tablet className="h-3.5 w-3.5" />}
                  {size === "mobile" && <Smartphone className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          {state.status === "complete" && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onReset}
                className="p-2 text-scai-text-muted hover:text-scai-text hover:bg-scai-surface rounded-lg transition-all duration-200"
                title="Reset"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
              </button>
              {state.historyId && (
                <Button variant="secondary" size="sm" onClick={() => setExportDialogOpen(true)}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Export
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleDownload}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar - Show when complete */}
      {state.status === "complete" && (
        <div className="flex-shrink-0 border-b border-scai-border bg-scai-surface/50 px-5 py-2.5 flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-scai-brand1/10">
              <Sparkles className="h-3 w-3 text-scai-brand1" />
            </div>
            <span className="text-sm font-semibold tabular-nums">{state.wordCount.toLocaleString()} words</span>
          </div>
          {elapsedTime !== undefined && (
            <div className="flex items-center gap-1.5 text-sm text-scai-text-sec">
              <Clock className="h-3 w-3 text-scai-text-muted" />
              <span className="font-mono text-xs">{formatTime(elapsedTime)}</span>
            </div>
          )}
          {/* SCAI Validation Badge */}
          {scaiValidation && (
            <div className="flex items-center gap-2 ml-auto">
              <span
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold tabular-nums ${scaiValidation.score >= 90
                    ? "bg-green-500/10 text-green-400 border border-green-500/15"
                    : scaiValidation.score >= 70
                      ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/15"
                      : "bg-red-500/10 text-red-400 border border-red-500/15"
                  }`}
              >
                {scaiValidation.score}%
              </span>
              {scaiValidation.summary.errorCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 font-medium">
                  {scaiValidation.summary.errorCount} errors
                </span>
              )}
              {scaiValidation.summary.warningCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 font-medium">
                  {scaiValidation.summary.warningCount} warnings
                </span>
              )}
            </div>
          )}
          {/* Local Validation Badge - Only show for whitelabel users */}
          {validationResult && showValidation && (
            <span
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold tabular-nums ${validationResult.score >= 80
                  ? "bg-success/10 text-success border border-success/15"
                  : validationResult.score >= 60
                    ? "bg-warning/10 text-warning border border-warning/15"
                    : "bg-error/10 text-error border border-error/15"
                }`}
            >
              {validationResult.score}% compliant
            </span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {state.status === "generating" && (
        <div className="h-0.5 bg-scai-surface flex-shrink-0 overflow-hidden">
          <div
            className="h-full bg-gradient-primary transition-all duration-500 ease-out relative"
            style={{ width: `${state.progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
      )}

      {/* Generating status message */}
      {state.status === "generating" && state.statusMessage && (
        <div className="flex-shrink-0 border-b border-scai-border bg-scai-card/80 backdrop-blur-sm px-5 py-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-scai-brand1 flex items-center gap-2 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-scai-brand1 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-scai-brand1" />
              </span>
              {state.statusMessage}
            </p>
            {elapsedTime !== undefined && (
              <div className="flex items-center gap-1.5 text-[11px] text-scai-text-muted">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{formatTime(elapsedTime)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden bg-scai-surface/50 p-4">
        {viewMode === "preview" ? (
          /* Live Preview with iframe */
          <>
            {/* Idle State — Premium empty state */}
            {state.status === "idle" && !state.html && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-lg relative">
                  {/* Ambient gradient glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-glow-radial opacity-30 blur-2xl pointer-events-none" />

                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-scai-brand1/15 via-scai-brand2/10 to-scai-brand3/5 border border-scai-brand1/10 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_-10px_rgba(64,237,195,0.15)]">
                      <FileCode className="w-9 h-9 text-scai-brand1/70" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 tracking-tight">
                      Ready to Generate
                    </h3>
                    <p className="text-sm text-scai-text-sec leading-relaxed max-w-sm mx-auto">
                      Configure your article settings and hit generate to watch your content being built in real-time.
                    </p>

                    {/* Keyboard shortcut hint */}
                    <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-scai-card border border-scai-border px-4 py-2">
                      <kbd className="px-1.5 py-0.5 rounded-md bg-scai-surface border border-scai-border text-[10px] font-mono text-scai-text-muted">
                        ⌘
                      </kbd>
                      <span className="text-scai-text-muted text-[10px]">+</span>
                      <kbd className="px-1.5 py-0.5 rounded-md bg-scai-surface border border-scai-border text-[10px] font-mono text-scai-text-muted">
                        Enter
                      </kbd>
                      <span className="text-xs text-scai-text-muted ml-1">to generate</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State - No content yet (skip warmup if HTML is streaming) */}
            {state.status === "generating" && !state.displayedHtml && !state.html && (
              <GenerationWarmup
                topic={topic}
                articleType={ARTICLE_TYPES.find((t) => t.id === articleType)?.name || articleType}
              />
            )}

            {/* Preview with Browser Chrome — use displayedHtml during generation (reveal), html when complete */}
            {(state.displayedHtml || (state.status !== "generating" && state.html)) && (
              <div
                className="mx-auto h-full overflow-hidden rounded-xl bg-white shadow-card transition-all duration-300"
                style={{
                  width: VIEWPORT_SIZES[viewport].width,
                  maxWidth: "100%",
                }}
              >
                {/* Browser chrome */}
                <div className="flex items-center gap-2 border-b border-scai-border bg-scai-card px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-scai-surface border border-scai-border-dim px-4 py-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-scai-brand1/50" />
                      <span className="text-[11px] text-scai-text-muted font-mono">
                        {articleType}.article.preview
                      </span>
                    </div>
                  </div>
                  <div className="w-[52px]" /> {/* Spacer to balance traffic lights */}
                </div>

                {/* Iframe preview */}
                <IsolatedArticlePreview
                  ref={isolatedPreviewRef}
                  html={
                    state.status === "generating" || state.phase === "images"
                      ? state.displayedHtml
                      : state.html
                  }
                  className="h-[calc(100%-40px)] w-full"
                  streaming={state.status === "generating"}
                />
              </div>
            )}

            {/* Error State */}
            {state.status === "error" && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-error/5 blur-3xl pointer-events-none" />
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-error/10 border border-error/10 flex items-center justify-center mx-auto mb-6">
                      <FileCode className="w-9 h-9 text-error/70" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-error">
                      Generation Failed
                    </h3>
                    <p className="text-sm text-scai-text-sec mb-5">{state.error}</p>
                    <button
                      onClick={onReset}
                      className="px-5 py-2.5 bg-scai-card border border-scai-border rounded-xl hover:bg-scai-surface hover:border-scai-border-bright transition-all duration-200 text-sm font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : viewMode === "code" ? (
          /* Code View - uses memoized extraction for instant response */
          <div className="h-full overflow-auto">
            {state.html ? (
              <Tabs defaultValue="html" className="h-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                </TabsList>

                <TabsContent value="html" className="mt-0">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-3 z-10 rounded-lg"
                      onClick={() => handleCopy("html")}
                    >
                      {copiedType === "html" ? (
                        <Check className="h-3.5 w-3.5 text-scai-brand1" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <pre className="max-h-[calc(100vh-20rem)] overflow-x-auto rounded-xl bg-scai-page border border-scai-border p-5 text-sm text-[#d4d4d4] font-mono leading-relaxed">
                      <code>{extractedContent}</code>
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="css" className="mt-0">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-3 z-10 rounded-lg"
                      onClick={() => handleCopy("css")}
                    >
                      {copiedType === "css" ? (
                        <Check className="h-3.5 w-3.5 text-scai-brand1" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <pre className="max-h-[calc(100vh-20rem)] overflow-x-auto rounded-xl bg-scai-page border border-scai-border p-5 text-sm text-[#d4d4d4] font-mono leading-relaxed">
                      <code>{extractedStyles || "No CSS extracted"}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            ) : state.displayedHtml ? (
              <pre className="max-h-[calc(100vh-20rem)] overflow-x-auto rounded-xl bg-scai-page border border-scai-border p-5 text-sm text-[#d4d4d4] font-mono leading-relaxed">
                <code>{state.displayedHtml}</code>
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-scai-text-muted">Generate an article to see the code</p>
              </div>
            )}
          </div>
        ) : (
          /* Validation View */
          <ValidationView
            validationResult={validationResult}
            html={state.html}
            articleType={articleType}
            variation={variation}
            topic={topic}
            onRevalidate={() => {
              setValidationResult(
                validateArticle(
                  state.html,
                  articleType,
                  variation,
                  topic,
                  state.coreKeywords,
                ),
              );
            }}
          />
        )}
      </div>

      {/* Unified CMS Export Dialog */}
      <CMSExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        historyId={state.historyId || ""}
        articleTitle={topic}
      />
    </div>
  );
});

// Validation Report Component
interface ValidationViewProps {
  validationResult: ValidationResult | null;
  html: string;
  articleType: string;
  variation: TitleVariation;
  topic: string;
  onRevalidate: () => void;
}

function ValidationView({
  validationResult,
  html,
  articleType,
  variation,
  topic,
  onRevalidate,
}: ValidationViewProps) {
  const [copied, setCopied] = useState(false);

  // Format validation result as text for copying
  const formatValidationAsText = () => {
    if (!validationResult) return "";

    let text = `# Article Validation Report\n\n`;
    text += `**Score:** ${validationResult.score}%\n`;
    text += `**Status:** ${validationResult.score >= 80 ? "Good Compliance" : validationResult.score >= 60 ? "Needs Improvement" : "Poor Compliance"}\n`;
    text += `**Rules Passed:** ${validationResult.totalPassed}/${validationResult.totalRules}\n\n`;
    text += `**Article Type:** ${articleType}\n`;
    text += `**Topic:** ${topic}\n`;
    text += `**Title Variation:** ${variation}\n\n`;
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

  if (!validationResult) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-scai-surface border border-scai-border flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="w-7 h-7 text-scai-text-muted" />
          </div>
          <p className="text-sm text-scai-text-sec">
            Generate an article first to validate it
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Score Header */}
        <div className="bg-scai-card border border-scai-border rounded-2xl p-6 relative overflow-hidden">
          {/* Score accent line */}
          <div className={`absolute top-0 left-0 right-0 h-[2px] ${
            validationResult.score >= 80 ? "bg-green-500" : validationResult.score >= 60 ? "bg-yellow-500" : "bg-red-500"
          }`} />
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold tracking-tight">Compliance Report</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="text-xs text-scai-text-sec hover:text-scai-text flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-scai-border hover:border-scai-border-bright transition-all duration-200"
                title="Copy validation report"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-scai-brand1" />
                    <span className="text-scai-brand1">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={onRevalidate}
                className="text-xs text-scai-brand1 hover:text-scai-brand2 flex items-center gap-1 transition-all duration-200 px-3 py-1.5 rounded-lg border border-scai-brand1/20 hover:border-scai-brand1/40 bg-scai-brand1/5"
              >
                <RefreshCcw className="w-3 h-3" />
                Re-validate
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Score Circle */}
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold tabular-nums border-2 ${validationResult.score >= 80
                  ? "border-green-500/30 text-green-400 bg-green-500/10"
                  : validationResult.score >= 60
                    ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                    : "border-red-500/30 text-red-400 bg-red-500/10"
                }`}
            >
              {validationResult.score}%
            </div>

            <div>
              <p
                className={`text-base font-semibold ${validationResult.score >= 80
                    ? "text-green-400"
                    : validationResult.score >= 60
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
              >
                {validationResult.score >= 90
                  ? "Excellent Compliance"
                  : validationResult.score >= 80
                    ? "Good Compliance"
                    : validationResult.score >= 60
                      ? "Needs Improvement"
                      : "Poor Compliance"}
              </p>
              <p className="text-xs text-scai-text-muted mt-1 font-mono">
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
            className="bg-scai-card border border-scai-border rounded-2xl overflow-hidden"
          >
            <div className="px-5 py-3 bg-scai-surface/50 border-b border-scai-border flex items-center justify-between">
              <h4 className="font-semibold text-sm">{category.label}</h4>
              <span
                className={`text-xs font-semibold tabular-nums ${category.passed === category.total
                    ? "text-green-400"
                    : category.passed >= category.total / 2
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
              >
                {category.passed}/{category.total}
              </span>
            </div>

            <div className="divide-y divide-scai-border-dim">
              {category.rules.map((rule) => (
                <div key={rule.id} className="px-5 py-3 flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {rule.status === "pass" && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {rule.status === "warn" && (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                    {rule.status === "fail" && (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>

                  {/* Rule Details */}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">{rule.name}</span>
                    <div className="text-[11px] text-scai-text-sec mt-1 space-y-0.5">
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
                          className={`mt-0.5 ${
                            rule.status === "fail"
                              ? "text-red-400"
                              : "text-yellow-400"
                          }`}
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
