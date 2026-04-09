"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertTriangle,
  Upload,
  Sparkles,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { TaxonomyPicker } from "./TaxonomyPicker";
import {
  useWordPressConnections,
  useWordPressTaxonomy,
  useSuggestTaxonomy,
} from "@/lib/hooks/queries";
import type {
  WordPressConnectionInfo,
  TaxonomySuggestion,
} from "@/lib/hooks/queries";
import { useWordPressExport } from "@/lib/hooks/useWordPressExport";

interface WordPressExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyIds: string[];
  articleKeywords?: string[];
}

const EXPORT_TOAST_ID = "wp-export-progress";

export function WordPressExportDialog({
  open,
  onOpenChange,
  historyIds,
  articleKeywords = [],
}: WordPressExportDialogProps) {
  const [selectedConnection, setSelectedConnection] = useState<string>("");
  const [postStatus, setPostStatus] = useState<"draft" | "publish">("draft");

  // Per-article taxonomy selections: historyId -> { categories, tags }
  const [articleTaxonomy, setArticleTaxonomy] = useState<
    Record<string, { categories: string[]; tags: string[] }>
  >({});

  // Track which bulk articles are expanded for editing
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());

  const isBulk = historyIds.length > 1;

  const { data: connections, isLoading: loadingConnections } =
    useWordPressConnections();
  const { data: taxonomy, isLoading: loadingTaxonomy } =
    useWordPressTaxonomy(selectedConnection || null);
  const suggestMutation = useSuggestTaxonomy();
  const { state: exportState, isExporting, startExport, retryFailed, reset: resetExport } =
    useWordPressExport();

  // Persistent toast for background progress
  useEffect(() => {
    if (exportState.status === "running") {
      toast.loading(`Exporting articles (${exportState.completed}/${exportState.total})`, {
        id: EXPORT_TOAST_ID,
        description: "You can close this dialog.",
        duration: Infinity,
      });
    } else if (exportState.status === "completed") {
      toast.dismiss(EXPORT_TOAST_ID);
      if (exportState.failed > 0) {
        toast.warning(
          `Exported ${exportState.completed}, failed ${exportState.failed}`,
          { description: "Open export dialog to retry failed articles." }
        );
      } else {
        toast.success(
          exportState.total === 1
            ? "Article exported successfully!"
            : `${exportState.completed} articles exported!`
        );
      }
    } else if (exportState.status === "failed" && exportState.completed === 0) {
      toast.dismiss(EXPORT_TOAST_ID);
      toast.error("Export failed", {
        description: exportState.error || "An error occurred.",
      });
    }
  }, [exportState.status, exportState.completed, exportState.failed, exportState.total, exportState.error]);

  // Auto-trigger AI suggestions when site is selected
  useEffect(() => {
    if (selectedConnection && historyIds.length > 0) {
      suggestMutation.mutate(
        { connectionId: selectedConnection, historyIds },
        {
          onSuccess: (suggestions) => {
            const initial: Record<string, { categories: string[]; tags: string[] }> = {};
            for (const id of historyIds) {
              const s = suggestions[id];
              if (s) {
                initial[id] = {
                  categories: [...s.categories, ...s.newCategories],
                  tags: [...s.tags, ...s.newTags],
                };
              } else {
                initial[id] = { categories: [], tags: [] };
              }
            }
            setArticleTaxonomy(initial);
          },
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnection]);

  const getSuggestionForArticle = useCallback(
    (historyId: string): TaxonomySuggestion | null => {
      if (!suggestMutation.data) return null;
      return suggestMutation.data[historyId] || null;
    },
    [suggestMutation.data]
  );

  const updateArticleCategories = (historyId: string, categories: string[]) => {
    setArticleTaxonomy((prev) => ({
      ...prev,
      [historyId]: { ...prev[historyId], categories },
    }));
  };

  const updateArticleTags = (historyId: string, tags: string[]) => {
    setArticleTaxonomy((prev) => ({
      ...prev,
      [historyId]: { ...prev[historyId], tags },
    }));
  };

  const toggleExpanded = (id: string) => {
    setExpandedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    if (!selectedConnection) {
      toast.error("Please select a destination site");
      return;
    }

    const articles = historyIds.map((id, idx) => {
      const tax = articleTaxonomy[id] || { categories: [], tags: [] };
      return {
        historyId: id,
        keyword: articleKeywords[idx] || `Article ${idx + 1}`,
        categories: tax.categories,
        tags: tax.tags,
      };
    });

    await startExport({
      connectionId: selectedConnection,
      postStatus,
      articles,
    });
  };

  const handleClose = () => {
    // Only fully reset if not currently exporting
    if (!isExporting) {
      resetExport();
      setSelectedConnection("");
      setArticleTaxonomy({});
      setExpandedArticles(new Set());
    }
    onOpenChange(false);
  };

  const handleDone = () => {
    resetExport();
    setSelectedConnection("");
    setArticleTaxonomy({});
    setExpandedArticles(new Set());
    onOpenChange(false);
  };

  const isSuggesting = suggestMutation.isPending;
  const hasSuggestions = !!suggestMutation.data;
  const firstArticleId = historyIds[0];

  // Determine which view to show
  const showForm = exportState.status === "idle";
  const showProgress = exportState.status === "starting" || exportState.status === "running";
  const showResults = exportState.status === "completed" || exportState.status === "failed";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={isBulk ? "max-w-lg" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-scai-brand1" />
            {showProgress
              ? "Exporting..."
              : showResults
                ? "Export Complete"
                : isBulk
                  ? "Export Articles"
                  : "Export Article"}
          </DialogTitle>
          <DialogDescription>
            {showProgress
              ? `Exporting ${exportState.total} article${exportState.total !== 1 ? "s" : ""} in the background.`
              : showResults
                ? `${exportState.completed} exported, ${exportState.failed} failed.`
                : isBulk
                  ? `Export ${historyIds.length} articles to your connected site.`
                  : articleKeywords[0]
                    ? `Export "${articleKeywords[0]}" to your connected site.`
                    : "Export this article to your connected site."}
          </DialogDescription>
        </DialogHeader>

        {/* ─── Progress View ─── */}
        {showProgress && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-4 h-4 animate-spin text-scai-brand1" />
              <span className="text-sm text-scai-text-sec">
                {exportState.completed + exportState.failed} of {exportState.total} processed
              </span>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {exportState.articles.map((article) => (
                <div
                  key={article.historyId}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-scai-border bg-scai-surface"
                >
                  {article.status === "pending" && (
                    <div className="w-4 h-4 rounded-full border-2 border-scai-border flex-shrink-0" />
                  )}
                  {article.status === "exporting" && (
                    <Loader2 className="w-4 h-4 animate-spin text-scai-brand1 flex-shrink-0" />
                  )}
                  {article.status === "completed" && (
                    <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  )}
                  {article.status === "failed" && (
                    <XCircle className="w-4 h-4 text-error flex-shrink-0" />
                  )}
                  <span className="text-sm text-scai-text flex-1 truncate">
                    {article.keyword}
                  </span>
                  {article.postUrl && (
                    <a
                      href={article.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-scai-brand1 hover:underline text-xs flex items-center gap-1 flex-shrink-0"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ─── Results View ─── */}
        {showResults && (
          <div className="space-y-2">
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {exportState.articles.map((article) => (
                <div
                  key={article.historyId}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    article.status === "completed"
                      ? "bg-success/5 border-success/20"
                      : "bg-error/5 border-error/20"
                  }`}
                >
                  {article.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-error flex-shrink-0" />
                  )}
                  <span className="text-sm text-scai-text flex-1 truncate">
                    {article.keyword}
                  </span>
                  {article.postUrl && (
                    <a
                      href={article.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-scai-brand1 hover:underline text-xs flex items-center gap-1 flex-shrink-0"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {article.error && (
                    <span className="text-xs text-error truncate max-w-[120px]" title={article.error}>
                      {article.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              {exportState.failed > 0 && (
                <Button
                  variant="ghost"
                  onClick={retryFailed}
                  disabled={isExporting}
                  className="mr-auto"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retry Failed ({exportState.failed})
                </Button>
              )}
              <Button variant="primary" onClick={handleDone}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ─── Form View ─── */}
        {showForm && (
          <div className="space-y-4">
            {/* Site selector */}
            <div>
              <label className="block text-sm font-medium text-scai-text-sec mb-2">
                Destination
              </label>
              {loadingConnections ? (
                <div className="flex items-center gap-2 text-sm text-scai-text-muted">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading connections...
                </div>
              ) : connections && connections.length > 0 ? (
                <Select
                  value={selectedConnection}
                  onValueChange={setSelectedConnection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((conn: WordPressConnectionInfo) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        <span className="flex items-center gap-2 min-w-0 max-w-full">
                          <span className="truncate min-w-0">
                            {conn.siteName || conn.siteUrl}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0 rounded text-[9px] font-medium bg-info/10 text-info whitespace-nowrap">
                            WordPress
                          </span>
                          {conn.pluginStatus === "active" && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[9px] font-medium bg-success/10 text-success whitespace-nowrap">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Plugin
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-scai-text-muted">
                  No sites connected. Go to Settings to add one.
                </p>
              )}
            </div>

            {/* Plugin warning */}
            {selectedConnection &&
              connections?.find((c: WordPressConnectionInfo) => c.id === selectedConnection)?.pluginStatus !== "active" && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/5 border border-warning/20">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-xs text-warning">
                  <p className="font-medium">SCAI Renderer plugin not installed</p>
                  <p className="mt-0.5 opacity-80">
                    Article styling may differ from preview. Install the plugin in Settings for consistent rendering.
                  </p>
                </div>
              </div>
            )}

            {/* Post Status */}
            <div>
              <label className="block text-sm font-medium text-scai-text-sec mb-2">
                Post Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["draft", "publish"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setPostStatus(s)}
                    className={`py-2 px-4 text-sm rounded-lg border transition-all ${
                      postStatus === s
                        ? "bg-scai-brand1/10 border-scai-brand1 text-scai-brand1 font-medium"
                        : "bg-scai-surface border-scai-border text-scai-text-sec hover:border-scai-border-bright"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories & Tags */}
            {selectedConnection && (
              <>
                {/* Loading states */}
                {(loadingTaxonomy || isSuggesting) && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-scai-brand1/5 border border-scai-brand1/20">
                    <Sparkles className="w-4 h-4 text-scai-brand1 animate-pulse" />
                    <span className="text-sm text-scai-text-sec">
                      {loadingTaxonomy
                        ? "Loading site taxonomy..."
                        : "AI is suggesting categories & tags..."}
                    </span>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-scai-brand1 ml-auto" />
                  </div>
                )}

                {/* Single article: inline pickers */}
                {!isBulk && taxonomy && (
                  <>
                    <TaxonomyPicker
                      label="Categories"
                      placeholder="Search categories..."
                      available={taxonomy.categories}
                      selected={articleTaxonomy[firstArticleId]?.categories || []}
                      suggested={getSuggestionForArticle(firstArticleId)?.categories}
                      newSuggestions={getSuggestionForArticle(firstArticleId)?.newCategories}
                      onChange={(cats) => updateArticleCategories(firstArticleId, cats)}
                    />
                    <TaxonomyPicker
                      label="Tags"
                      placeholder="Search tags..."
                      available={taxonomy.tags}
                      selected={articleTaxonomy[firstArticleId]?.tags || []}
                      suggested={getSuggestionForArticle(firstArticleId)?.tags}
                      newSuggestions={getSuggestionForArticle(firstArticleId)?.newTags}
                      onChange={(t) => updateArticleTags(firstArticleId, t)}
                    />
                  </>
                )}

                {/* Bulk: collapsible per-article taxonomy */}
                {isBulk && taxonomy && hasSuggestions && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-scai-text-sec">
                        Categories & Tags
                      </label>
                      <span className="text-xs text-scai-text-muted">
                        AI assigned for {historyIds.length} articles
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {historyIds.map((id, idx) => {
                        const keyword = articleKeywords[idx] || `Article ${idx + 1}`;
                        const tax = articleTaxonomy[id] || { categories: [], tags: [] };
                        const isExpanded = expandedArticles.has(id);

                        return (
                          <div
                            key={id}
                            className="rounded-lg border border-scai-border bg-scai-surface"
                          >
                            <button
                              type="button"
                              onClick={() => toggleExpanded(id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left"
                            >
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-scai-text-muted transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                              <span className="text-sm text-scai-text truncate flex-1">
                                {keyword}
                              </span>
                              <span className="text-[10px] text-scai-text-muted whitespace-nowrap">
                                {tax.categories.length} cat, {tax.tags.length} tags
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="px-3 pb-3 space-y-3 border-t border-scai-border pt-3">
                                <TaxonomyPicker
                                  label="Categories"
                                  placeholder="Search categories..."
                                  available={taxonomy.categories}
                                  selected={tax.categories}
                                  suggested={getSuggestionForArticle(id)?.categories}
                                  newSuggestions={getSuggestionForArticle(id)?.newCategories}
                                  onChange={(cats) => updateArticleCategories(id, cats)}
                                />
                                <TaxonomyPicker
                                  label="Tags"
                                  placeholder="Search tags..."
                                  available={taxonomy.tags}
                                  selected={tax.tags}
                                  suggested={getSuggestionForArticle(id)?.tags}
                                  newSuggestions={getSuggestionForArticle(id)?.newTags}
                                  onChange={(t) => updateArticleTags(id, t)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleExport}
                disabled={
                  !selectedConnection ||
                  isExporting ||
                  !connections?.length
                }
              >
                <Upload className="w-4 h-4 mr-2" />
                Export {isBulk ? `${historyIds.length} Articles` : "Article"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
