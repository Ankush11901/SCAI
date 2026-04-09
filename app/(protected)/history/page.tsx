"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  History,
  FileText,
  Trash2,
  Download,
  Eye,
  Loader2,
  Calendar,
  Hash,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  Upload,
} from "lucide-react";
import { ARTICLE_TYPES } from "@/data/article-types";
import { BulkJobsTab } from "@/components/history/BulkJobsTab";
import {
  wrapInHtmlDocument,
  sanitizeFilename,
} from "@/lib/utils/article-export";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { IsolatedArticlePreview } from "@/components/article/IsolatedArticlePreview";
import { GenerationCostBadge } from "@/components/costs/generation-cost-badge";
import {
  useHistory,
  useHistoryEntry,
  useDeleteHistoryEntry,
  useInvalidateQueries,
  useWordPressConnections,
  type HistoryEntry,
  type HistoryEntryDetail,
} from "@/lib/hooks/queries";
import { useCMSConnections } from "@/lib/hooks/useCMSConnections";
import { CMSExportDialog } from "@/components/cms/CMSExportDialog";
import { BulkExportDialog } from "@/components/cms/BulkExportDialog";
import { CreditExhaustedModal } from "@/components/billing";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type HistoryTab = "articles" | "bulk";

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<HistoryTab>("articles");
  const [page, setPage] = useState(0);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const limit = 10;
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Filter state
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportIds, setExportIds] = useState<string[]>([]);
  const [exportKeywords, setExportKeywords] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Single article export (CMS dialog)
  const [cmsExportDialogOpen, setCmsExportDialogOpen] = useState(false);
  const [cmsExportHistoryId, setCmsExportHistoryId] = useState("");
  const [cmsExportTitle, setCmsExportTitle] = useState("");

  // Paywall modal state for testing
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallTier, setPaywallTier] = useState<"free" | "pro">("free");
  const [paywallResetsIn, setPaywallResetsIn] = useState<string | undefined>();
  const [paywallRenewsIn, setPaywallRenewsIn] = useState<string | undefined>();

  // Debug: Show paywall via keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+P - Show paywall for Pro tier (bulk export blocked)
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setPaywallTier("pro");
        setPaywallResetsIn(undefined);
        setPaywallRenewsIn("~28 days");
        setShowPaywall(true);
      }
      // Ctrl+Shift+F - Show paywall for Free tier (bulk export blocked)
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setPaywallTier("free");
        setPaywallResetsIn("~28 days");
        setPaywallRenewsIn(undefined);
        setShowPaywall(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Build query options
  const queryOptions = useMemo(
    () => ({
      limit,
      offset: page * limit,
      articleType: filterType || undefined,
      status: filterStatus || undefined,
    }),
    [page, filterType, filterStatus]
  );

  // TanStack Query hooks
  const {
    data: historyData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useHistory(queryOptions);

  const { data: entryData, isLoading: previewLoading } =
    useHistoryEntry(selectedEntryId);

  const deleteEntry = useDeleteHistoryEntry();
  const { invalidateHistory } = useInvalidateQueries();
  const { data: wpConnections } = useWordPressConnections();
  const { data: cmsConnections } = useCMSConnections();
  const hasWpConnections = (wpConnections?.length ?? 0) > 0;
  const hasCmsConnections = (cmsConnections?.length ?? 0) > 0;
  const hasConnections = hasWpConnections || hasCmsConnections;

  // Single article export - opens unified CMS dialog
  const handleExport = (id: string, keyword: string) => {
    setCmsExportHistoryId(id);
    setCmsExportTitle(keyword);
    setCmsExportDialogOpen(true);
  };

  // Selection helpers for bulk export
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Extract data
  const entries: HistoryEntry[] = historyData?.data?.entries ?? [];
  const total = historyData?.data?.total ?? 0;
  const pagination = historyData?.data?.pagination ?? {
    limit,
    offset: 0,
    hasMore: false,
  };
  const previewEntry: HistoryEntryDetail | null = entryData?.data ?? null;

  // Completed entries on current page (for select-all logic)
  const completedEntries = useMemo(
    () => entries.filter((e) => e.status === "completed"),
    [entries]
  );
  const allCompletedSelected =
    completedEntries.length > 0 &&
    completedEntries.every((e) => selectedIds.has(e.id));

  const toggleSelectAll = useCallback(() => {
    if (allCompletedSelected) {
      clearSelection();
    } else {
      setSelectedIds(new Set(completedEntries.map((e) => e.id)));
    }
  }, [allCompletedSelected, completedEntries, clearSelection]);

  // Bulk export - all platforms (uses BulkExportDialog)
  const handleBulkExport = useCallback(() => {
    const selected = entries.filter((e) => selectedIds.has(e.id));
    setExportIds(selected.map((e) => e.id));
    setExportKeywords(selected.map((e) => e.keyword));
    setExportDialogOpen(true);
  }, [entries, selectedIds]);

  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(0);
    clearSelection();
  };

  // Delete entry
  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteEntry.mutateAsync(deleteTargetId);
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  // Download entry
  const handleDownload = (entry: HistoryEntryDetail) => {
    if (!entry.htmlContent) return;

    const fullHtml = wrapInHtmlDocument(entry.htmlContent, {
      title: entry.keyword,
      description: `${entry.articleType} article about ${entry.keyword}`,
    });

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entry.articleType}-${sanitizeFilename(entry.keyword)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get article type name
  const getArticleTypeName = (id: string) => {
    return ARTICLE_TYPES.find((t) => t.id === id)?.name || id;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      completed: "bg-green-500/10 text-green-500 border-green-500/20",
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      failed: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    return (
      <span
        className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors[status as keyof typeof colors] || colors.pending
          }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-scai-brand1/10 flex items-center justify-center">
              <History className="w-5 h-5 text-scai-brand1" />
            </div>
            Generation History
          </h1>
          <p className="text-scai-text-sec mt-1">
            View and manage your previously generated articles
          </p>
        </div>
        {activeTab === "articles" && (
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            variant="secondary"
            size="icon"
            title="Refresh history"
            aria-label="Refresh history"
          >
            <RefreshCcw className={`w-5 h-5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-scai-input rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("articles")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "articles"
              ? "bg-scai-card shadow-sm text-scai-text"
              : "text-scai-text-sec hover:text-scai-text"
            }`}
        >
          <FileText className="w-4 h-4" />
          Single Articles
        </button>
        <button
          onClick={() => setActiveTab("bulk")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "bulk"
              ? "bg-scai-card shadow-sm text-scai-text"
              : "text-scai-text-sec hover:text-scai-text"
            }`}
        >
          <Layers className="w-4 h-4" />
          Bulk Articles
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === "bulk" ? (
        <BulkJobsTab />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 p-4 bg-scai-card border border-scai-border rounded-xl">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-scai-text-sec mb-1.5">
                Article Type
              </label>
              <Select value={filterType} onValueChange={handleFilterChange(setFilterType)}>
                <SelectTrigger aria-label="Filter by article type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ARTICLE_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-scai-text-sec mb-1.5">
                Status
              </label>
              <Select value={filterStatus} onValueChange={handleFilterChange(setFilterStatus)}>
                <SelectTrigger aria-label="Filter by status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setFilterType("");
                  setFilterStatus("");
                  setPage(0);
                }}
                variant="ghost"
                size="sm"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Content */}
          {isLoading && entries.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-scai-brand1 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Error Loading History</h3>
              <p className="text-scai-text-sec mb-4">
                {error instanceof Error ? error.message : "Failed to load history"}
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-scai-brand1 text-scai-page rounded-lg hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-scai-input flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-scai-text-muted" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No History Yet</h3>
              <p className="text-scai-text-sec">
                Your generated articles will appear here
              </p>
            </div>
          ) : (
            <>
              {/* Entries Table */}
              <div className="bg-scai-card border border-scai-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-scai-surface border-b border-scai-border">
                        {hasConnections && (
                          <th className="px-4 py-3 w-10">
                            <Checkbox
                              checked={allCompletedSelected && completedEntries.length > 0}
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all completed articles"
                            />
                          </th>
                        )}
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-scai-text-sec uppercase tracking-wide">
                          Cost
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-scai-text-sec uppercase tracking-wide">
                          Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-scai-text-sec uppercase tracking-wide">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-scai-border">
                      {entries.map((entry) => (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-scai-surface/50 transition-colors"
                        >
                          {hasConnections && (
                            <td className="px-4 py-3 w-10">
                              {entry.status === "completed" ? (
                                <Checkbox
                                  checked={selectedIds.has(entry.id)}
                                  onCheckedChange={() => toggleSelect(entry.id)}
                                  aria-label={`Select ${entry.keyword}`}
                                />
                              ) : (
                                <div className="w-4 h-4" />
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-scai-text-muted flex-shrink-0" />
                              <span className="font-medium truncate max-w-[200px]">
                                {entry.keyword}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-scai-text-sec">
                            {getArticleTypeName(entry.articleType)}
                          </td>
                          <td className="px-4 py-3 text-sm text-scai-text-sec">
                            <div className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              {(entry.wordCount ?? 0).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={entry.status} />
                          </td>
                          <td className="px-4 py-3">
                            {entry.status === "completed" && (
                              <GenerationCostBadge historyId={entry.id} />
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-scai-text-sec">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(entry.createdAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedEntryId(entry.id)}
                                className="p-1.5 rounded-lg text-scai-text-sec hover:text-scai-brand1 hover:bg-scai-brand1/10 transition-colors"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {entry.status === "completed" && (
                                <button
                                  onClick={() => handleExport(entry.id, entry.keyword)}
                                  className="p-1.5 rounded-lg text-scai-text-sec hover:text-scai-brand1 hover:bg-scai-brand1/10 transition-colors"
                                  title="Export to CMS"
                                >
                                  <Upload className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setDeleteTargetId(entry.id)}
                                className="p-1.5 rounded-lg text-scai-text-sec hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 bg-scai-surface border-t border-scai-border">
                  <div className="text-sm text-scai-text-sec">
                    Showing {pagination.offset + 1} -{" "}
                    {Math.min(pagination.offset + entries.length, total)} of {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => { setPage((p) => Math.max(0, p - 1)); clearSelection(); }}
                      disabled={page === 0 || isLoading}
                      variant="secondary"
                      size="icon"
                      title="Previous page"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => { setPage((p) => p + 1); clearSelection(); }}
                      disabled={!pagination.hasMore || isLoading}
                      variant="secondary"
                      size="icon"
                      title="Next page"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Floating Bulk Export Toolbar */}
      <AnimatePresence>
        {selectedIds.size > 0 && hasConnections && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-5 py-3 bg-scai-card border border-scai-border rounded-xl shadow-2xl"
          >
            <span className="text-sm text-scai-text-sec whitespace-nowrap">
              {selectedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              Deselect All
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkExport}
            >
              <Upload className="w-4 h-4 mr-2" />
              Export
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Export Dialog (all platforms) */}
      <BulkExportDialog
        open={exportDialogOpen}
        onOpenChange={(open) => {
          setExportDialogOpen(open);
          if (!open) clearSelection();
        }}
        historyIds={exportIds}
        articleKeywords={exportKeywords}
      />

      {/* CMS Export Dialog (all platforms - single article) */}
      <CMSExportDialog
        open={cmsExportDialogOpen}
        onOpenChange={setCmsExportDialogOpen}
        historyId={cmsExportHistoryId}
        articleTitle={cmsExportTitle}
      />

      {/* Preview Modal (Articles tab) */}
      <AnimatePresence>
        {activeTab === "articles" && (previewEntry || previewLoading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedEntryId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-scai-card border border-scai-border rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {previewLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-scai-brand1 animate-spin" />
                </div>
              ) : previewEntry ? (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-scai-border">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {previewEntry.keyword}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-scai-text-sec mt-1">
                        <span>
                          {getArticleTypeName(previewEntry.articleType)}
                        </span>
                        <span>•</span>
                        <span>
                          {(previewEntry.wordCount ?? 0).toLocaleString()} words
                        </span>
                        <span>•</span>
                        <StatusBadge status={previewEntry.status} />
                        {previewEntry.status === "completed" && (
                          <>
                            <span>•</span>
                            <GenerationCostBadge historyId={previewEntry.id} />
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {previewEntry.status === "completed" && (
                        <Button
                          onClick={() => handleExport(previewEntry.id, previewEntry.keyword)}
                          variant="secondary"
                          size="sm"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDownload(previewEntry)}
                        variant="primary"
                        size="sm"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      <Button
                        onClick={() => setSelectedEntryId(null)}
                        variant="secondary"
                        size="icon"
                        title="Close preview"
                        aria-label="Close preview"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Modal Content (Isolated in iframe) */}
                  <div className="flex-1 min-h-0 overflow-hidden bg-white">
                    {previewEntry.htmlContent ? (
                      <IsolatedArticlePreview
                        html={previewEntry.htmlContent}
                        className="h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center py-20 text-scai-text-sec">
                        No content available
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paywall Modal */}
      <CreditExhaustedModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        tier={paywallTier}
        resetsIn={paywallResetsIn}
        renewsIn={paywallRenewsIn}
      />

      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}
        title="Delete Article"
        description="Are you sure you want to delete this article? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
