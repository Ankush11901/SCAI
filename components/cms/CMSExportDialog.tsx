"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  FileText,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Send,
  Search,
  Upload,
  Sparkles,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import { useCMSConnections, useExportToCMS } from "@/lib/hooks/useCMSConnections";
import {
  useWordPressConnections,
  useWordPressTaxonomy,
  useSuggestTaxonomy,
  type WordPressConnectionInfo,
  type TaxonomySuggestion,
} from "@/lib/hooks/queries";
import { useWordPressExport } from "@/lib/hooks/useWordPressExport";
import { CMS_PLATFORMS, type CMSPlatform } from "@/lib/services/cms/types";
import type { CMSConnectionData } from "@/lib/services/cms/types";

// ─── Constants ──────────────────────────────────────────────────────────────

const SEARCH_THRESHOLD = 5;
const WP_EXPORT_TOAST_ID = "wp-export-progress";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CMSExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyId: string;
  articleTitle: string;
}

type CmsExportState = "idle" | "exporting" | "success" | "error";

interface CmsExportResult {
  postUrl?: string;
  editUrl?: string;
  message?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CMSExportDialog({
  open,
  onOpenChange,
  historyId,
  articleTitle,
}: CMSExportDialogProps) {
  // ── Shared state ──
  const [search, setSearch] = useState("");
  const [publishStatus, setPublishStatus] = useState<"draft" | "publish">("draft");

  // ── CMS-specific state ──
  const [selectedConnection, setSelectedConnection] = useState<CMSConnectionData | null>(null);
  const [title, setTitle] = useState(articleTitle);
  const [tags, setTags] = useState("");
  const [cmsExportState, setCmsExportState] = useState<CmsExportState>("idle");
  const [cmsExportResult, setCmsExportResult] = useState<CmsExportResult | null>(null);

  // ── WordPress-specific state ──
  const [selectedWpConn, setSelectedWpConn] = useState<WordPressConnectionInfo | null>(null);
  const [wpTaxonomy, setWpTaxonomy] = useState<{ categories: string[]; tags: string[] }>({ categories: [], tags: [] });

  // ── Data hooks ──
  const { data: cmsConnections, isLoading: cmsLoading } = useCMSConnections();
  const { data: wpConnections, isLoading: wpLoading } = useWordPressConnections();
  const exportMutation = useExportToCMS();

  // ── WordPress hooks (called unconditionally, enabled when WP selected) ──
  const wpConnectionId = selectedWpConn?.id || null;
  const { data: wpTaxonomyData, isLoading: loadingTaxonomy } = useWordPressTaxonomy(wpConnectionId);
  const suggestMutation = useSuggestTaxonomy();
  const { state: wpExportState, isExporting: wpIsExporting, startExport: wpStartExport, retryFailed: wpRetryFailed, reset: wpReset } = useWordPressExport();

  const isLoading = cmsLoading || wpLoading;

  // ── Derived ──
  const hasConnections = useMemo(() => {
    return (cmsConnections && cmsConnections.length > 0) || (wpConnections && wpConnections.length > 0);
  }, [cmsConnections, wpConnections]);

  const totalConnectionCount = (wpConnections?.length || 0) + (cmsConnections?.length || 0);
  const showSearch = totalConnectionCount > SEARCH_THRESHOLD;

  const searchLower = search.trim().toLowerCase();
  const filteredWpConns = searchLower
    ? wpConnections?.filter(c =>
      (c.siteName || c.siteUrl).toLowerCase().includes(searchLower) ||
      "wordpress".includes(searchLower)
    )
    : wpConnections;
  const filteredCmsConns = searchLower
    ? cmsConnections?.filter(c =>
      c.name.toLowerCase().includes(searchLower) ||
      c.platform.toLowerCase().includes(searchLower)
    )
    : cmsConnections;

  const selectedCmsConfig = selectedConnection
    ? CMS_PLATFORMS.find((p) => p.id === selectedConnection.platform)
    : null;

  // ── View state ──
  const showPicker = !selectedConnection && !selectedWpConn;
  const showCmsForm = !!selectedConnection && cmsExportState !== "success";
  const showCmsSuccess = !!selectedConnection && cmsExportState === "success";
  const showWpForm = !!selectedWpConn;

  const wpShowForm = wpExportState.status === "idle";
  const wpShowProgress = wpExportState.status === "starting" || wpExportState.status === "running";
  const wpShowResults = wpExportState.status === "completed" || wpExportState.status === "failed";

  // ── WordPress: auto-suggest taxonomy ──
  useEffect(() => {
    if (wpConnectionId) {
      suggestMutation.mutate(
        { connectionId: wpConnectionId, historyIds: [historyId] },
        {
          onSuccess: (suggestions) => {
            const s = suggestions[historyId];
            if (s) {
              setWpTaxonomy({
                categories: [...s.categories, ...s.newCategories],
                tags: [...s.tags, ...s.newTags],
              });
            }
          },
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wpConnectionId]);

  // ── WordPress: progress toast ──
  useEffect(() => {
    if (wpExportState.status === "running") {
      toast.loading(`Exporting article...`, { id: WP_EXPORT_TOAST_ID, duration: Infinity });
    } else if (wpExportState.status === "completed") {
      toast.dismiss(WP_EXPORT_TOAST_ID);
      if (wpExportState.failed > 0) {
        toast.warning("Export failed", { description: "Try again or check your connection." });
      } else {
        toast.success("Article exported successfully!");
      }
    } else if (wpExportState.status === "failed" && wpExportState.completed === 0) {
      toast.dismiss(WP_EXPORT_TOAST_ID);
      toast.error("Export failed", { description: wpExportState.error || "An error occurred." });
    }
  }, [wpExportState.status, wpExportState.completed, wpExportState.failed, wpExportState.error]);

  const wpSuggestion: TaxonomySuggestion | null = suggestMutation.data?.[historyId] || null;

  // ── Reset view to picker when dialog reopens (keep form data) ──
  useEffect(() => {
    if (open) {
      setSelectedConnection(null);
      setSelectedWpConn(null);
      setCmsExportState("idle");
      setCmsExportResult(null);
      setWpTaxonomy({ categories: [], tags: [] });
      setSearch("");
      wpReset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Handlers ──
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const handleBack = () => {
    setSelectedConnection(null);
    setSelectedWpConn(null);
    setCmsExportState("idle");
    setCmsExportResult(null);
    setWpTaxonomy({ categories: [], tags: [] });
    wpReset();
  };

  const handleCmsExport = async () => {
    if (!selectedConnection) return;
    setCmsExportState("exporting");
    setCmsExportResult(null);
    try {
      const result = await exportMutation.mutateAsync({
        connectionId: selectedConnection.id,
        historyId,
        title,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        publishStatus,
      });
      setCmsExportState("success");
      setCmsExportResult({ postUrl: result.postUrl, editUrl: result.editUrl, message: result.message });
      toast.success(result.message);
    } catch (error) {
      setCmsExportState("error");
      const msg = error instanceof Error ? error.message : "Export failed";
      setCmsExportResult({ message: msg });
      toast.error(msg);
    }
  };

  const handleWpExport = async () => {
    if (!wpConnectionId) return;
    await wpStartExport({
      connectionId: wpConnectionId,
      postStatus: publishStatus,
      articles: [{
        historyId,
        keyword: articleTitle,
        categories: wpTaxonomy.categories,
        tags: wpTaxonomy.tags,
      }],
    });
  };

  const handleWpDone = () => {
    wpReset();
    onOpenChange(false);
  };

  // ── Determine AnimatePresence key ──
  const viewKey = showPicker ? "picker" : showCmsSuccess ? "cms-success" : showWpForm ? "wp-form" : "cms-form";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-scai-text-muted" />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {/* ════════ Step 1: Platform Picker ════════ */}
            {showPicker && (
              <motion.div
                key="picker"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-6"
              >
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Export Article</DialogTitle>
                  <DialogDescription className="text-scai-text-muted">Select destination</DialogDescription>
                </DialogHeader>

                {!hasConnections ? (
                  <div className="text-center py-6">
                    <div className="p-3 rounded-full bg-scai-border mx-auto w-fit mb-3">
                      <AlertCircle className="w-5 h-5 text-scai-text-sec" />
                    </div>
                    <p className="text-sm text-scai-text mb-1">No platforms connected</p>
                    <p className="text-xs text-scai-text-muted mb-4">Connect a platform in Settings to start exporting.</p>
                    <Button variant="secondary" onClick={() => handleOpenChange(false)} className="w-full">Close</Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                      {/* WordPress Cards — one per connection */}
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
                        const platform = CMS_PLATFORMS.find(p => p.id === conn.platform);
                        return (
                          <button
                            key={conn.id}
                            onClick={() => setSelectedConnection(conn)}
                            className="flex flex-col items-start p-4 rounded-xl border transition-all text-left relative overflow-hidden group bg-scai-card border-scai-border hover:border-scai-brand1"
                          >
                            <div className="p-2 rounded-lg mb-3" style={{ backgroundColor: platform?.bgColor || "#333" }}>
                              <CMSPlatformIcon platform={conn.platform as CMSPlatform} className="w-6 h-6 text-white" />
                            </div>
                            <div className="space-y-1 min-w-0 w-full">
                              <h3 className="font-semibold text-scai-text leading-none truncate">{conn.name}</h3>
                              <p className="text-[10px] text-scai-text-muted leading-tight line-clamp-2">
                                {platform?.name || conn.platform}
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

                    <Button variant="secondary" onClick={() => handleOpenChange(false)} className="w-full">
                      Cancel
                    </Button>
                  </>
                )}
              </motion.div>
            )}

            {/* ════════ CMS Export Form ════════ */}
            {showCmsForm && (
              <motion.div
                key="cms-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={handleBack} className="p-1.5 rounded-lg hover:bg-scai-surface transition-colors text-scai-text-sec hover:text-scai-text focus:outline-none">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: selectedCmsConfig?.bgColor || "#333" }}>
                      <CMSPlatformIcon platform={selectedConnection!.platform as CMSPlatform} className="w-5 h-5" />
                    </div>
                    <div>
                      <DialogTitle>Export to {selectedCmsConfig?.name || selectedConnection!.platform}</DialogTitle>
                      <DialogDescription className="mt-0.5">{selectedConnection!.name}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title" />
                  <Input label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="seo, content, marketing" />

                  <div>
                    <label className="block text-sm font-medium text-scai-text-sec mb-2">Publish Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPublishStatus("draft")}
                        className={cn(
                          "py-2 px-4 text-sm rounded-lg border transition-all focus:outline-none",
                          publishStatus === "draft"
                            ? "bg-scai-brand1/10 border-scai-brand1 text-scai-brand1 font-medium"
                            : "bg-scai-surface border-scai-border text-scai-text-sec hover:border-scai-border-bright"
                        )}
                      >
                        Save as Draft
                      </button>
                      <button
                        onClick={() => setPublishStatus("publish")}
                        className={cn(
                          "py-2 px-4 text-sm rounded-lg border transition-all focus:outline-none",
                          publishStatus === "publish"
                            ? "bg-scai-brand1/10 border-scai-brand1 text-scai-brand1 font-medium"
                            : "bg-scai-surface border-scai-border text-scai-text-sec hover:border-scai-border-bright"
                        )}
                      >
                        Publish Now
                      </button>
                    </div>
                  </div>

                  {cmsExportState === "error" && cmsExportResult?.message && (
                    <div className="p-3 rounded-lg bg-error/10 border border-error/20">
                      <p className="text-sm text-error">{cmsExportResult.message}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={cmsExportState === "exporting"} className="w-full">
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={handleCmsExport} disabled={cmsExportState === "exporting"} className="w-full">
                      {cmsExportState === "exporting" ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
                      ) : (
                        <><Send className="w-4 h-4 mr-2" />Export Now</>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════════ CMS Success ════════ */}
            {showCmsSuccess && (
              <motion.div
                key="cms-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="text-center py-4"
              >
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-success" />
                <p className="text-sm font-medium text-scai-text mb-1">
                  {cmsExportResult?.message || "Article exported successfully!"}
                </p>
                <p className="text-xs text-scai-text-muted mb-4">
                  Your article has been sent to {selectedCmsConfig?.name || selectedConnection!.platform}
                </p>
                <div className="space-y-2">
                  {cmsExportResult?.postUrl && (
                    <a href={cmsExportResult.postUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-gradient-primary text-scai-page font-medium text-sm hover:opacity-90 transition-opacity">
                      View Published Article <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {cmsExportResult?.editUrl && (
                    <a href={cmsExportResult.editUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg border border-scai-border text-scai-text text-sm hover:bg-scai-surface transition-colors">
                      Edit in CMS <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <Button variant="secondary" onClick={() => handleOpenChange(false)} className="w-full mt-1">
                    Close
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ════════ WordPress Export Form ════════ */}
            {showWpForm && (
              <motion.div
                key="wp-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={wpShowForm ? handleBack : undefined}
                      disabled={!wpShowForm}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors focus:outline-none",
                        wpShowForm ? "hover:bg-scai-surface text-scai-text-sec hover:text-scai-text" : "text-scai-text-muted cursor-default"
                      )}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="p-2 rounded-lg bg-[#21759b]">
                      <WordPressIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <DialogTitle>
                        {wpShowProgress ? "Exporting..." : wpShowResults ? "Export Complete" : "Export to WordPress"}
                      </DialogTitle>
                      <DialogDescription className="mt-0.5">
                        {selectedWpConn!.siteName || selectedWpConn!.siteUrl}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* WP: Form view */}
                {wpShowForm && (
                  <div className="space-y-4">
                    {/* Plugin warning */}
                    {selectedWpConn!.pluginStatus !== "active" && (
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

                    {/* Post status */}
                    <div>
                      <label className="block text-sm font-medium text-scai-text-sec mb-2">Post Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPublishStatus("draft")}
                          className={cn(
                            "py-2 px-4 text-sm rounded-lg border transition-all focus:outline-none",
                            publishStatus === "draft"
                              ? "bg-scai-brand1/10 border-scai-brand1 text-scai-brand1 font-medium"
                              : "bg-scai-surface border-scai-border text-scai-text-sec hover:border-scai-border-bright"
                          )}
                        >
                          Save as Draft
                        </button>
                        <button
                          onClick={() => setPublishStatus("publish")}
                          className={cn(
                            "py-2 px-4 text-sm rounded-lg border transition-all focus:outline-none",
                            publishStatus === "publish"
                              ? "bg-scai-brand1/10 border-scai-brand1 text-scai-brand1 font-medium"
                              : "bg-scai-surface border-scai-border text-scai-text-sec hover:border-scai-border-bright"
                          )}
                        >
                          Publish Now
                        </button>
                      </div>
                    </div>

                    {/* Taxonomy loading */}
                    {(loadingTaxonomy || suggestMutation.isPending) && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-scai-brand1/5 border border-scai-brand1/20">
                        <Sparkles className="w-4 h-4 text-scai-brand1 animate-pulse" />
                        <span className="text-sm text-scai-text-sec">
                          {loadingTaxonomy ? "Loading site taxonomy..." : "AI is suggesting categories & tags..."}
                        </span>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-scai-brand1 ml-auto" />
                      </div>
                    )}

                    {/* Taxonomy pickers */}
                    {wpTaxonomyData && (
                      <>
                        <TaxonomyPicker
                          label="Categories"
                          placeholder="Search categories..."
                          available={wpTaxonomyData.categories}
                          selected={wpTaxonomy.categories}
                          suggested={wpSuggestion?.categories}
                          newSuggestions={wpSuggestion?.newCategories}
                          onChange={(cats) => setWpTaxonomy((prev) => ({ ...prev, categories: cats }))}
                        />
                        <TaxonomyPicker
                          label="Tags"
                          placeholder="Search tags..."
                          available={wpTaxonomyData.tags}
                          selected={wpTaxonomy.tags}
                          suggested={wpSuggestion?.tags}
                          newSuggestions={wpSuggestion?.newTags}
                          onChange={(t) => setWpTaxonomy((prev) => ({ ...prev, tags: t }))}
                        />
                      </>
                    )}

                    {/* Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button variant="secondary" onClick={() => handleOpenChange(false)} className="w-full">
                        Cancel
                      </Button>
                      <Button variant="primary" onClick={handleWpExport} disabled={wpIsExporting} className="w-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Export Now
                      </Button>
                    </div>
                  </div>
                )}

                {/* WP: Progress view */}
                {wpShowProgress && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-scai-brand1" />
                      <span className="text-sm text-scai-text-sec">Exporting article...</span>
                    </div>
                    <div className="space-y-1.5">
                      {wpExportState.articles.map((article) => (
                        <div key={article.historyId} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-scai-border bg-scai-surface">
                          {article.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-scai-border flex-shrink-0" />}
                          {article.status === "exporting" && <Loader2 className="w-4 h-4 animate-spin text-scai-brand1 flex-shrink-0" />}
                          {article.status === "completed" && <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />}
                          {article.status === "failed" && <XCircle className="w-4 h-4 text-error flex-shrink-0" />}
                          <span className="text-sm text-scai-text flex-1 truncate">{article.keyword}</span>
                          {article.postUrl && (
                            <a href={article.postUrl} target="_blank" rel="noopener noreferrer" className="text-scai-brand1 hover:underline text-xs flex items-center gap-1 flex-shrink-0">
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 pt-2">
                      <Button variant="secondary" onClick={() => handleOpenChange(false)} className="w-full">Close</Button>
                    </div>
                  </div>
                )}

                {/* WP: Results view */}
                {wpShowResults && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      {wpExportState.articles.map((article) => (
                        <div
                          key={article.historyId}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border",
                            article.status === "completed" ? "bg-success/5 border-success/20" : "bg-error/5 border-error/20"
                          )}
                        >
                          {article.status === "completed" ? (
                            <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-error flex-shrink-0" />
                          )}
                          <span className="text-sm text-scai-text flex-1 truncate">{article.keyword}</span>
                          {article.postUrl && (
                            <a href={article.postUrl} target="_blank" rel="noopener noreferrer" className="text-scai-brand1 hover:underline text-xs flex items-center gap-1 flex-shrink-0">
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {article.error && (
                            <span className="text-xs text-error truncate max-w-[120px]" title={article.error}>{article.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {wpExportState.failed > 0 && (
                        <Button variant="secondary" onClick={wpRetryFailed} disabled={wpIsExporting} className="w-full">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Retry
                        </Button>
                      )}
                      <Button variant="primary" onClick={handleWpDone} className={cn("w-full", wpExportState.failed === 0 && "col-span-2")}>
                        Done
                      </Button>
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
