"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  FileText,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Upload,
  Search,
  Sparkles,
  XCircle,
  RotateCcw,
  ChevronDown,
  FolderOpen,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { CMSPlatformIcon } from "./CMSIcons";
import { WordPressIcon } from "@/components/wordpress/WordPressIcon";
import { TaxonomyPicker } from "@/components/wordpress/TaxonomyPicker";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { useCMSConnections } from "@/lib/hooks/useCMSConnections";
import type { ExportRequest, ExportResponse } from "@/lib/hooks/useCMSConnections";
import type { CMSConnectionData } from "@/lib/services/cms/types";
import {
  useWordPressConnections,
  useWordPressTaxonomy,
  useSuggestTaxonomy,
  type WordPressConnectionInfo,
  type TaxonomySuggestion,
} from "@/lib/hooks/queries";
import { useWordPressExport } from "@/lib/hooks/useWordPressExport";
import { CMS_PLATFORMS, type CMSPlatform } from "@/lib/services/cms/types";

// ─── Constants ──────────────────────────────────────────────────────────────

const SEARCH_THRESHOLD = 5;
const WP_EXPORT_TOAST_ID = "wp-bulk-export-progress";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BulkExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyIds: string[];
  articleKeywords: string[];
}

type CmsBulkArticle = {
  historyId: string;
  keyword: string;
  status: "pending" | "exporting" | "success" | "error";
  error?: string;
  postUrl?: string;
};

// ─── Component ──────────────────────────────────────────────────────────────

export function BulkExportDialog({
  open,
  onOpenChange,
  historyIds,
  articleKeywords,
}: BulkExportDialogProps) {
  // ── Shared state ──
  const [search, setSearch] = useState("");
  const [publishStatus, setPublishStatus] = useState<"draft" | "publish">("draft");

  // ── Selection state ──
  const [selectedWpConn, setSelectedWpConn] = useState<WordPressConnectionInfo | null>(null);
  const [selectedCmsConn, setSelectedCmsConn] = useState<CMSConnectionData | null>(null);

  // ── CMS bulk export state ──
  const [cmsBulkArticles, setCmsBulkArticles] = useState<CmsBulkArticle[]>([]);
  const [cmsBulkRunning, setCmsBulkRunning] = useState(false);
  const [cmsBulkDone, setCmsBulkDone] = useState(false);

  // ── WordPress state ──
  const [wpTaxonomy, setWpTaxonomy] = useState<Record<string, { categories: string[]; tags: string[] }>>({});
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  // ── Data hooks ──
  const { data: cmsConnections, isLoading: cmsLoading } = useCMSConnections();
  const { data: wpConnections, isLoading: wpLoading } = useWordPressConnections();

  // ── WordPress hooks ──
  const wpConnectionId = selectedWpConn?.id || null;
  const { data: wpTaxonomyData, isLoading: loadingTaxonomy } = useWordPressTaxonomy(wpConnectionId);
  const suggestMutation = useSuggestTaxonomy();
  const { state: wpExportState, isExporting: wpIsExporting, startExport: wpStartExport, retryFailed: wpRetryFailed, reset: wpReset } = useWordPressExport();

  const isLoading = cmsLoading || wpLoading;
  const isBulk = historyIds.length > 1;

  // ── Derived ──
  const hasConnections = (cmsConnections && cmsConnections.length > 0) || (wpConnections && wpConnections.length > 0);
  const totalConnectionCount = (wpConnections?.length || 0) + (cmsConnections?.length || 0);
  const showSearch = totalConnectionCount > SEARCH_THRESHOLD;

  const searchLower = search.trim().toLowerCase();
  const filteredWpConns = searchLower
    ? wpConnections?.filter(c => (c.siteName || c.siteUrl).toLowerCase().includes(searchLower) || "wordpress".includes(searchLower))
    : wpConnections;
  const filteredCmsConns = searchLower
    ? cmsConnections?.filter(c => c.name.toLowerCase().includes(searchLower) || c.platform.toLowerCase().includes(searchLower))
    : cmsConnections;

  const selectedCmsConfig = selectedCmsConn
    ? CMS_PLATFORMS.find((p) => p.id === selectedCmsConn.platform)
    : null;

  // ── View state ──
  const showPicker = !selectedCmsConn && !selectedWpConn;

  const wpShowForm = wpExportState.status === "idle";
  const wpShowProgress = wpExportState.status === "starting" || wpExportState.status === "running";
  const wpShowResults = wpExportState.status === "completed" || wpExportState.status === "failed";

  // ── Reset on open ──
  useEffect(() => {
    if (open) {
      setSelectedCmsConn(null);
      setSelectedWpConn(null);
      setPublishStatus("draft");
      setSearch("");
      setCmsBulkArticles([]);
      setCmsBulkRunning(false);
      setCmsBulkDone(false);
      setWpTaxonomy({});
      setExpandedArticleId(null);
      wpReset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── WordPress: auto-suggest taxonomy ──
  useEffect(() => {
    if (wpConnectionId && historyIds.length > 0) {
      suggestMutation.mutate(
        { connectionId: wpConnectionId, historyIds },
        {
          onSuccess: (suggestions) => {
            const initial: Record<string, { categories: string[]; tags: string[] }> = {};
            for (const id of historyIds) {
              const s = suggestions[id];
              if (s) {
                initial[id] = { categories: [...s.categories, ...s.newCategories], tags: [...s.tags, ...s.newTags] };
              } else {
                initial[id] = { categories: [], tags: [] };
              }
            }
            setWpTaxonomy(initial);
          },
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wpConnectionId]);

  // ── WordPress: progress toast ──
  useEffect(() => {
    if (wpExportState.status === "running") {
      toast.loading(`Exporting articles (${wpExportState.completed}/${wpExportState.total})`, { id: WP_EXPORT_TOAST_ID, description: "You can close this dialog.", duration: Infinity });
    } else if (wpExportState.status === "completed") {
      toast.dismiss(WP_EXPORT_TOAST_ID);
      if (wpExportState.failed > 0) {
        toast.warning(`Exported ${wpExportState.completed}, failed ${wpExportState.failed}`);
      } else {
        toast.success(wpExportState.total === 1 ? "Article exported!" : `${wpExportState.completed} articles exported!`);
      }
    } else if (wpExportState.status === "failed" && wpExportState.completed === 0) {
      toast.dismiss(WP_EXPORT_TOAST_ID);
      toast.error("Export failed", { description: wpExportState.error || "An error occurred." });
    }
  }, [wpExportState.status, wpExportState.completed, wpExportState.failed, wpExportState.total, wpExportState.error]);

  const getSuggestionForArticle = useCallback((historyId: string): TaxonomySuggestion | null => {
    if (!suggestMutation.data) return null;
    return suggestMutation.data[historyId] || null;
  }, [suggestMutation.data]);

  // ── Handlers ──
  const handleBack = () => {
    setSelectedCmsConn(null);
    setSelectedWpConn(null);
    setCmsBulkArticles([]);
    setCmsBulkRunning(false);
    setCmsBulkDone(false);
    setWpTaxonomy({});
    setExpandedArticleId(null);
    wpReset();
  };

  const handleWpExport = async () => {
    if (!wpConnectionId) return;
    const articles = historyIds.map((id, idx) => {
      const tax = wpTaxonomy[id] || { categories: [], tags: [] };
      return { historyId: id, keyword: articleKeywords[idx] || `Article ${idx + 1}`, categories: tax.categories, tags: tax.tags };
    });
    await wpStartExport({ connectionId: wpConnectionId, postStatus: publishStatus, articles });
  };

  const handleCmsExport = async () => {
    if (!selectedCmsConn) return;

    const initial: CmsBulkArticle[] = historyIds.map((id, idx) => ({
      historyId: id,
      keyword: articleKeywords[idx] || `Article ${idx + 1}`,
      status: "pending",
    }));
    setCmsBulkArticles(initial);
    setCmsBulkRunning(true);
    setCmsBulkDone(false);

    for (let i = 0; i < initial.length; i++) {
      setCmsBulkArticles((prev) => prev.map((a, j) => j === i ? { ...a, status: "exporting" } : a));

      try {
        const res = await fetch("/api/cms/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId: selectedCmsConn.id,
            historyId: initial[i].historyId,
            title: initial[i].keyword,
            tags: [],
            publishStatus,
          } satisfies ExportRequest),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Export failed");

        setCmsBulkArticles((prev) => prev.map((a, j) => j === i ? { ...a, status: "success", postUrl: data.postUrl } : a));
      } catch (err) {
        setCmsBulkArticles((prev) => prev.map((a, j) => j === i ? { ...a, status: "error", error: err instanceof Error ? err.message : "Failed" } : a));
      }
    }

    setCmsBulkRunning(false);
    setCmsBulkDone(true);
  };

  const handleDone = () => {
    wpReset();
    onOpenChange(false);
  };

  const cmsSuccessCount = cmsBulkArticles.filter((a) => a.status === "success").length;
  const cmsFailCount = cmsBulkArticles.filter((a) => a.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-scai-text-muted" />
          </div>
        ) : !hasConnections ? (
          <div className="text-center py-6">
            <div className="p-3 rounded-full bg-scai-border mx-auto w-fit mb-3">
              <AlertCircle className="w-5 h-5 text-scai-text-sec" />
            </div>
            <p className="text-sm text-scai-text mb-1">No platforms connected</p>
            <p className="text-xs text-scai-text-muted mb-4">Connect a platform in Settings to start exporting.</p>
            <Button variant="primary" size="sm" onClick={() => onOpenChange(false)}>Go to Settings</Button>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {/* ════════ Step 1: Platform Picker ════════ */}
            {showPicker && (
              <motion.div key="picker" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2, ease: "easeOut" }} className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Export {historyIds.length} Article{historyIds.length !== 1 ? "s" : ""}</DialogTitle>
                  <DialogDescription className="text-scai-text-muted">Select destination</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {/* WordPress Cards */}
                  {filteredWpConns?.map((conn) => (
                    <button
                      key={`wp-${conn.id}`}
                      onClick={() => setSelectedWpConn(conn)}
                      className="flex flex-col items-start p-4 rounded-xl border transition-all text-left relative overflow-hidden group bg-scai-card border-scai-border hover:border-scai-brand1"
                    >
                      <div className="p-2 rounded-lg bg-[#21759b] mb-3">
                        <WordPressIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="space-y-1 min-w-0 w-full">
                        <h3 className="font-semibold text-scai-text leading-none truncate">{conn.siteName || conn.siteUrl}</h3>
                        <p className="text-[10px] text-scai-text-muted leading-tight line-clamp-2">WordPress</p>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-success" />
                        <span className="text-[10px] font-medium text-scai-text-sec">Connected</span>
                      </div>
                    </button>
                  ))}

                  {/* Connected CMS Platform Cards */}
                  {filteredCmsConns?.map((conn) => {
                    const config = CMS_PLATFORMS.find((p) => p.id === conn.platform);
                    return (
                      <button
                        key={conn.id}
                        onClick={() => setSelectedCmsConn(conn)}
                        className="flex flex-col items-start p-4 rounded-xl border transition-all text-left relative overflow-hidden group bg-scai-card border-scai-border hover:border-scai-brand1"
                      >
                        <div className="p-2 rounded-lg mb-3" style={{ backgroundColor: config?.bgColor || "#333" }}>
                          <CMSPlatformIcon platform={conn.platform as CMSPlatform} className="w-6 h-6 text-white" />
                        </div>
                        <div className="space-y-1 min-w-0 w-full">
                          <h3 className="font-semibold text-scai-text leading-none truncate">{conn.name}</h3>
                          <p className="text-[10px] text-scai-text-muted leading-tight line-clamp-2">
                            {config?.name || conn.platform}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-success" />
                          <span className="text-[10px] font-medium text-scai-text-sec">Connected</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full">
                  Cancel
                </Button>
              </motion.div>
            )}

            {/* ════════ CMS Bulk Export ════════ */}
            {selectedCmsConn && (
              <motion.div key="cms-bulk" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={!cmsBulkRunning ? handleBack : undefined} disabled={cmsBulkRunning} className={cn("p-1.5 rounded-lg transition-colors focus:outline-none", cmsBulkRunning ? "text-scai-text-muted cursor-default" : "hover:bg-scai-surface text-scai-text-sec hover:text-scai-text")}>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: selectedCmsConfig?.bgColor || "#333" }}>
                      <CMSPlatformIcon platform={selectedCmsConn.platform as CMSPlatform} className="w-5 h-5" />
                    </div>
                    <div>
                      <DialogTitle>{cmsBulkDone ? "Export Complete" : cmsBulkRunning ? "Exporting..." : `Export to ${selectedCmsConfig?.name || selectedCmsConn.platform}`}</DialogTitle>
                      <DialogDescription className="mt-0.5">{selectedCmsConn.name}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Form */}
                {!cmsBulkRunning && !cmsBulkDone && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-scai-text-sec mb-2">Publish Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setPublishStatus("draft")} className={cn("py-2 px-4 text-sm rounded-lg border transition-all focus:outline-none", publishStatus === "draft" ? "bg-scai-brand1/10 border-scai-brand1 text-scai-brand1 font-medium" : "bg-scai-surface border-scai-border text-scai-text-sec hover:border-scai-border-bright")}>
                          Save as Draft
                        </button>
                        <button onClick={() => setPublishStatus("publish")} className={cn("py-2 px-4 text-sm rounded-lg border transition-all focus:outline-none", publishStatus === "publish" ? "bg-scai-brand1/10 border-scai-brand1 text-scai-brand1 font-medium" : "bg-scai-surface border-scai-border text-scai-text-sec hover:border-scai-border-bright")}>
                          Publish Now
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-scai-text-muted">
                      {historyIds.length} article{historyIds.length !== 1 ? "s" : ""} will be exported to {selectedCmsConfig?.name || selectedCmsConn.platform}. Each article&apos;s keyword will be used as the title.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full">Cancel</Button>
                      <Button variant="primary" onClick={handleCmsExport} className="w-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Export {historyIds.length} Article{historyIds.length !== 1 ? "s" : ""}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Progress / Results */}
                {(cmsBulkRunning || cmsBulkDone) && (
                  <div className="space-y-3">
                    {cmsBulkRunning && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-scai-brand1" />
                        <span className="text-sm text-scai-text-sec">
                          {cmsBulkArticles.filter((a) => a.status === "success" || a.status === "error").length} of {cmsBulkArticles.length} processed
                        </span>
                      </div>
                    )}
                    {cmsBulkDone && (
                      <p className="text-sm text-scai-text-sec">
                        {cmsSuccessCount} exported{cmsFailCount > 0 ? `, ${cmsFailCount} failed` : ""}
                      </p>
                    )}
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {cmsBulkArticles.map((article) => (
                        <div
                          key={article.historyId}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border",
                            article.status === "success" ? "bg-success/5 border-success/20" :
                            article.status === "error" ? "bg-error/5 border-error/20" :
                            "border-scai-border bg-scai-surface"
                          )}
                        >
                          {article.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-scai-border flex-shrink-0" />}
                          {article.status === "exporting" && <Loader2 className="w-4 h-4 animate-spin text-scai-brand1 flex-shrink-0" />}
                          {article.status === "success" && <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />}
                          {article.status === "error" && <XCircle className="w-4 h-4 text-error flex-shrink-0" />}
                          <span className="text-sm text-scai-text flex-1 truncate">{article.keyword}</span>
                          {article.postUrl && (
                            <a href={article.postUrl} target="_blank" rel="noopener noreferrer" className="text-scai-brand1 hover:underline text-xs flex items-center gap-1 flex-shrink-0">
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {article.error && <span className="text-xs text-error truncate max-w-[120px]" title={article.error}>{article.error}</span>}
                        </div>
                      ))}
                    </div>
                    {cmsBulkDone && (
                      <div className="grid grid-cols-1 pt-2">
                        <Button variant="primary" onClick={handleDone} className="w-full">Done</Button>
                      </div>
                    )}
                    {cmsBulkRunning && (
                      <div className="grid grid-cols-1 pt-2">
                        <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full">Close</Button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ════════ WordPress Bulk Export ════════ */}
            {selectedWpConn && (
              <motion.div key="wp-bulk" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={wpShowForm ? handleBack : undefined} disabled={!wpShowForm} className={cn("p-1.5 rounded-lg transition-colors focus:outline-none", wpShowForm ? "hover:bg-scai-surface text-scai-text-sec hover:text-scai-text" : "text-scai-text-muted cursor-default")}>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="p-2 rounded-lg bg-[#21759b]"><WordPressIcon className="w-5 h-5 text-white" /></div>
                    <div>
                      <DialogTitle>{wpShowProgress ? "Exporting..." : wpShowResults ? "Export Complete" : "Export to WordPress"}</DialogTitle>
                      <DialogDescription className="mt-0.5">{selectedWpConn.siteName || selectedWpConn.siteUrl}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* WP Form */}
                {wpShowForm && (
                  <div className="space-y-4">
                    {selectedWpConn.pluginStatus !== "active" && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/5 border border-warning/20">
                        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-warning">
                          <p className="font-medium">SCAI Renderer plugin not installed</p>
                          <p className="mt-0.5 opacity-80">Article styling may differ from preview.</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-scai-text-sec mb-2">Post Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setPublishStatus("draft")} className={cn("py-2 px-4 text-sm rounded-lg border transition-all focus:outline-none", publishStatus === "draft" ? "bg-scai-brand1/10 border-scai-brand1 text-scai-brand1 font-medium" : "bg-scai-surface border-scai-border text-scai-text-sec hover:border-scai-border-bright")}>
                          Save as Draft
                        </button>
                        <button onClick={() => setPublishStatus("publish")} className={cn("py-2 px-4 text-sm rounded-lg border transition-all focus:outline-none", publishStatus === "publish" ? "bg-scai-brand1/10 border-scai-brand1 text-scai-brand1 font-medium" : "bg-scai-surface border-scai-border text-scai-text-sec hover:border-scai-border-bright")}>
                          Publish Now
                        </button>
                      </div>
                    </div>

                    {(loadingTaxonomy || suggestMutation.isPending) && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-scai-brand1/5 border border-scai-brand1/20">
                        <Sparkles className="w-4 h-4 text-scai-brand1 animate-pulse" />
                        <span className="text-sm text-scai-text-sec">{loadingTaxonomy ? "Loading site taxonomy..." : "AI is suggesting categories & tags..."}</span>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-scai-brand1 ml-auto" />
                      </div>
                    )}

                    {/* For single article, show taxonomy inline */}
                    {!isBulk && wpTaxonomyData && (
                      <>
                        <TaxonomyPicker
                          label="Categories"
                          placeholder="Search categories..."
                          available={wpTaxonomyData.categories}
                          selected={wpTaxonomy[historyIds[0]]?.categories || []}
                          suggested={getSuggestionForArticle(historyIds[0])?.categories}
                          newSuggestions={getSuggestionForArticle(historyIds[0])?.newCategories}
                          onChange={(cats) => setWpTaxonomy((prev) => ({ ...prev, [historyIds[0]]: { ...prev[historyIds[0]], categories: cats } }))}
                        />
                        <TaxonomyPicker
                          label="Tags"
                          placeholder="Search tags..."
                          available={wpTaxonomyData.tags}
                          selected={wpTaxonomy[historyIds[0]]?.tags || []}
                          suggested={getSuggestionForArticle(historyIds[0])?.tags}
                          newSuggestions={getSuggestionForArticle(historyIds[0])?.newTags}
                          onChange={(t) => setWpTaxonomy((prev) => ({ ...prev, [historyIds[0]]: { ...prev[historyIds[0]], tags: t } }))}
                        />
                      </>
                    )}

                    {/* For bulk, show per-article taxonomy */}
                    {isBulk && wpTaxonomyData && !loadingTaxonomy && !suggestMutation.isPending && (
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-scai-text-sec">Categories & Tags per Article</label>
                        <div className="max-h-[240px] overflow-y-auto space-y-1 -mx-1 px-1">
                          {historyIds.map((id, idx) => {
                            const keyword = articleKeywords[idx] || `Article ${idx + 1}`;
                            const tax = wpTaxonomy[id] || { categories: [], tags: [] };
                            const isExpanded = expandedArticleId === id;

                            return (
                              <div key={id} className="border border-scai-border rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => setExpandedArticleId(isExpanded ? null : id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-scai-surface/50 transition-colors focus:outline-none"
                                >
                                  <ChevronDown className={cn("w-3.5 h-3.5 text-scai-text-muted transition-transform flex-shrink-0", isExpanded && "rotate-180")} />
                                  <span className="text-sm font-medium text-scai-text truncate flex-1 text-left">{keyword}</span>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {tax.categories.length > 0 && (
                                      <span className="flex items-center gap-0.5 text-[11px] text-scai-text-muted">
                                        <FolderOpen className="w-3 h-3" />{tax.categories.length}
                                      </span>
                                    )}
                                    {tax.tags.length > 0 && (
                                      <span className="flex items-center gap-0.5 text-[11px] text-scai-text-muted">
                                        <Tag className="w-3 h-3" />{tax.tags.length}
                                      </span>
                                    )}
                                  </div>
                                </button>
                                {isExpanded && (
                                  <div className="px-3 pb-3 pt-1 space-y-3 border-t border-scai-border bg-scai-surface/30">
                                    <TaxonomyPicker
                                      label="Categories"
                                      placeholder="Search categories..."
                                      available={wpTaxonomyData.categories}
                                      selected={tax.categories}
                                      suggested={getSuggestionForArticle(id)?.categories}
                                      newSuggestions={getSuggestionForArticle(id)?.newCategories}
                                      onChange={(cats) => setWpTaxonomy((prev) => ({ ...prev, [id]: { ...prev[id], categories: cats } }))}
                                    />
                                    <TaxonomyPicker
                                      label="Tags"
                                      placeholder="Search tags..."
                                      available={wpTaxonomyData.tags}
                                      selected={tax.tags}
                                      suggested={getSuggestionForArticle(id)?.tags}
                                      newSuggestions={getSuggestionForArticle(id)?.newTags}
                                      onChange={(t) => setWpTaxonomy((prev) => ({ ...prev, [id]: { ...prev[id], tags: t } }))}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full">Cancel</Button>
                      <Button variant="primary" onClick={handleWpExport} disabled={wpIsExporting} className="w-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Export {isBulk ? `${historyIds.length} Articles` : "Article"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* WP Progress */}
                {wpShowProgress && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-scai-brand1" />
                      <span className="text-sm text-scai-text-sec">{wpExportState.completed + wpExportState.failed} of {wpExportState.total} processed</span>
                    </div>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {wpExportState.articles.map((article) => (
                        <div key={article.historyId} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-scai-border bg-scai-surface">
                          {article.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-scai-border flex-shrink-0" />}
                          {article.status === "exporting" && <Loader2 className="w-4 h-4 animate-spin text-scai-brand1 flex-shrink-0" />}
                          {article.status === "completed" && <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />}
                          {article.status === "failed" && <XCircle className="w-4 h-4 text-error flex-shrink-0" />}
                          <span className="text-sm text-scai-text flex-1 truncate">{article.keyword}</span>
                          {article.postUrl && <a href={article.postUrl} target="_blank" rel="noopener noreferrer" className="text-scai-brand1 hover:underline text-xs flex items-center gap-1 flex-shrink-0">View <ExternalLink className="w-3 h-3" /></a>}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 pt-2">
                      <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full">Close</Button>
                    </div>
                  </div>
                )}

                {/* WP Results */}
                {wpShowResults && (
                  <div className="space-y-3">
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {wpExportState.articles.map((article) => (
                        <div key={article.historyId} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border", article.status === "completed" ? "bg-success/5 border-success/20" : "bg-error/5 border-error/20")}>
                          {article.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" /> : <XCircle className="w-4 h-4 text-error flex-shrink-0" />}
                          <span className="text-sm text-scai-text flex-1 truncate">{article.keyword}</span>
                          {article.postUrl && <a href={article.postUrl} target="_blank" rel="noopener noreferrer" className="text-scai-brand1 hover:underline text-xs flex items-center gap-1 flex-shrink-0">View <ExternalLink className="w-3 h-3" /></a>}
                          {article.error && <span className="text-xs text-error truncate max-w-[120px]" title={article.error}>{article.error}</span>}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {wpExportState.failed > 0 && (
                        <Button variant="secondary" onClick={wpRetryFailed} disabled={wpIsExporting} className="w-full">
                          <RotateCcw className="w-4 h-4 mr-2" />Retry ({wpExportState.failed})
                        </Button>
                      )}
                      <Button variant="primary" onClick={handleDone} className={cn("w-full", wpExportState.failed === 0 && "col-span-2")}>Done</Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </DialogContent>
    </Dialog>
  );
}
