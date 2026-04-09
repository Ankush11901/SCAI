"use client";

import { useState, useMemo, use } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  FileText,
  Download,
  Upload,
  Eye,
  Loader2,
  Calendar,
  Hash,
  X,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  RefreshCcw,
} from "lucide-react";
import { ARTICLE_TYPES } from "@/data/article-types";
import {
  wrapInHtmlDocument,
  sanitizeFilename,
} from "@/lib/utils/article-export";
import { Button } from "@/components/ui/Button";
import { IsolatedArticlePreview } from "@/components/article/IsolatedArticlePreview";
import { GenerationCostBadge } from "@/components/costs/generation-cost-badge";
import { BulkExportDialog } from "@/components/cms/BulkExportDialog";
import { useRouter } from "next/navigation";
import { useBulkJobArticles, useWordPressConnections, type BulkJobArticle } from "@/lib/hooks/queries";
import { useCMSConnections } from "@/lib/hooks/useCMSConnections";

export default function BulkJobArticlesPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();

  // TanStack Query hook
  const { data, isLoading, error, refetch } = useBulkJobArticles(jobId);

  // Preview modal state
  const [previewArticle, setPreviewArticle] = useState<BulkJobArticle | null>(null);

  // Export state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const { data: wpConnections } = useWordPressConnections();
  const { data: cmsConnections } = useCMSConnections();
  const hasConnections = (wpConnections?.length || 0) > 0 || (cmsConnections?.length || 0) > 0;

  // Extract data
  const job = data?.job ?? null;
  const articles: BulkJobArticle[] = data?.articles ?? [];
  const stats = data?.stats ?? null;

  // Completed articles with historyIds (for export)
  const completedForExport = useMemo(() =>
    articles.filter((a) => a.status === "complete" && a.historyId),
    [articles]
  );
  const exportHistoryIds = useMemo(() => completedForExport.map((a) => a.historyId!), [completedForExport]);
  const exportKeywords = useMemo(() => completedForExport.map((a) => a.keyword), [completedForExport]);

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

  // Download article
  const handleDownload = (article: BulkJobArticle) => {
    if (!article.htmlContent) return;

    const fullHtml = wrapInHtmlDocument(article.htmlContent, {
      title: article.keyword,
      description: `${article.articleType} article about ${article.keyword}`,
    });

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${article.articleType}-${sanitizeFilename(article.keyword)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download all articles
  const handleDownloadAll = async () => {
    const completeArticles = articles.filter(
      (a) => a.status === "complete" && a.htmlContent
    );

    for (const article of completeArticles) {
      await new Promise((r) => setTimeout(r, 300));
      handleDownload(article);
    }
  };

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      complete: "bg-green-500/10 text-green-500 border-green-500/20",
      generating: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      error: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    const labels = {
      complete: "Completed",
      generating: "Generating",
      pending: "Pending",
      error: "Failed",
    };

    return (
      <span
        className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
          colors[status as keyof typeof colors] || colors.pending
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-scai-brand1 animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-6">
        <Button
          onClick={() => router.push("/history")}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to History
        </Button>
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Error Loading Job</h3>
          <p className="text-scai-text-sec mb-4">
            {error instanceof Error ? error.message : "Job not found"}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-scai-brand1 text-scai-page rounded-lg hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            onClick={() => router.push("/history")}
            variant="ghost"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to History
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-scai-brand1/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-scai-brand1" />
            </div>
            {job.keyword || `Batch Generation`}
          </h1>
          <div className="flex items-center gap-3 text-scai-text-sec mt-2">
            <span>{stats?.total || 0} articles</span>
            <span>•</span>
            <span>{(stats?.totalWords || 0).toLocaleString()} words</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(job.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => refetch()}
            variant="secondary"
            size="icon"
            title="Refresh"
          >
            <RefreshCcw className="w-4 h-4" />
          </Button>
          {stats && stats.complete > 0 && (
            <>
              {hasConnections && exportHistoryIds.length > 0 && (
                <Button onClick={() => setExportDialogOpen(true)} variant="secondary" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Export All ({exportHistoryIds.length})
                </Button>
              )}
              <Button onClick={handleDownloadAll} variant="primary" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download All ({stats.complete})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="flex items-center gap-4 p-4 bg-scai-card border border-scai-border rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm">
              <span className="font-semibold text-green-500">{stats.complete}</span>{" "}
              <span className="text-scai-text-sec">completed</span>
            </span>
          </div>
          {stats.error > 0 && (
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm">
                <span className="font-semibold text-red-500">{stats.error}</span>{" "}
                <span className="text-scai-text-sec">failed</span>
              </span>
            </div>
          )}
          {(stats.pending > 0 || stats.generating > 0) && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">
                <span className="font-semibold text-yellow-500">
                  {stats.pending + stats.generating}
                </span>{" "}
                <span className="text-scai-text-sec">in progress</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Articles Table */}
      {articles.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-scai-input flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-scai-text-muted" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Articles</h3>
          <p className="text-scai-text-sec">
            This job has no articles yet
          </p>
        </div>
      ) : (
        <div className="bg-scai-card border border-scai-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-scai-surface border-b border-scai-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-scai-text-sec uppercase tracking-wide w-32">
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
                {articles.map((article) => (
                  <motion.tr
                    key={article.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-scai-surface/50 transition-colors"
                  >
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-scai-text-muted flex-shrink-0" />
                        <span className="font-medium truncate max-w-[200px]">
                          {article.keyword}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-scai-text-sec">
                      {getArticleTypeName(article.articleType)}
                    </td>
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
                    <td className="px-4 py-3">
                      <StatusBadge status={article.status} />
                    </td>
                    <td className="px-4 py-3">
                      {article.status === "complete" && article.historyId ? (
                        <GenerationCostBadge historyId={article.historyId} />
                      ) : (
                        <span className="text-scai-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-scai-text-sec">
                      {article.completedAt ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(article.completedAt)}
                        </div>
                      ) : (
                        <span className="text-scai-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {article.status === "complete" && article.htmlContent && (
                          <>
                            <button
                              onClick={() => setPreviewArticle(article)}
                              className="p-1.5 rounded-lg text-scai-text-sec hover:text-scai-brand1 hover:bg-scai-brand1/10 transition-colors"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(article)}
                              className="p-1.5 rounded-lg text-scai-text-sec hover:text-scai-brand1 hover:bg-scai-brand1/10 transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {article.status === "error" && article.errorMessage && (
                          <span
                            className="text-xs text-red-500 max-w-[150px] truncate"
                            title={article.errorMessage}
                          >
                            {article.errorMessage}
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setPreviewArticle(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-scai-card border border-scai-border rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-scai-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {previewArticle.priority === 1 && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                    <h3 className="font-semibold truncate">
                      {previewArticle.keyword}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-scai-text-sec mt-1">
                    <span>{getArticleTypeName(previewArticle.articleType)}</span>
                    <span>•</span>
                    <span>
                      {(previewArticle.wordCount ?? 0).toLocaleString()} words
                    </span>
                    {previewArticle.historyId && (
                      <>
                        <span>•</span>
                        <GenerationCostBadge historyId={previewArticle.historyId} />
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    onClick={() => handleDownload(previewArticle)}
                    variant="primary"
                    size="icon"
                    title="Download"
                    aria-label="Download article"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setPreviewArticle(null)}
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
                {previewArticle.htmlContent ? (
                  <IsolatedArticlePreview
                    html={previewArticle.htmlContent}
                    className="h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center py-20 text-scai-text-sec">
                    No content available
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Export Dialog (all platforms) */}
      <BulkExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        historyIds={exportHistoryIds}
        articleKeywords={exportKeywords}
      />
    </div>
  );
}
