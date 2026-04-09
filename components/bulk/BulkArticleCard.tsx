"use client";

import {
  Loader2,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  ClipboardCheck,
} from "lucide-react";
import { motion } from "motion/react";

export interface ArticleProgress {
  id: string;
  name: string;
  status: "pending" | "generating" | "complete" | "error";
  progress: number;
  html?: string;
  error?: string;
  wordCount?: number;
  keyword?: string;
  articleType?: string;
  variation?: string;
  priority?: number;
}

interface BulkArticleCardProps {
  article: ArticleProgress;
  showKeyword?: boolean;
  showValidation?: boolean;
  isRunning: boolean;
  onPreview: () => void;
  onValidate?: () => void;
  onDownload: () => void;
  onRetry: () => void;
}

export function BulkArticleCard({
  article,
  showKeyword = false,
  showValidation = false,
  isRunning,
  onPreview,
  onValidate,
  onDownload,
  onRetry,
}: BulkArticleCardProps) {
  const borderColor = {
    pending: "border-scai-border",
    generating: "border-scai-brand1/50",
    complete: "border-success/30",
    error: "border-error/30",
  }[article.status];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-scai-card border rounded-xl p-4 transition-all ${borderColor}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-sm truncate">{article.name}</h3>
          {showKeyword && article.keyword && (
            <p className="text-xs text-scai-text-muted truncate">
              {article.keyword}
            </p>
          )}
          {article.wordCount && (
            <p className="text-xs text-scai-text-muted">
              {article.wordCount.toLocaleString()} words
            </p>
          )}
        </div>
        <StatusIcon status={article.status} />
      </div>

      {/* Progress Bar */}
      {article.status === "generating" && (
        <div className="mb-3">
          <div className="h-1.5 bg-scai-input rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${article.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {article.status === "error" && (
        <div className="mb-3">
          <p className="text-xs text-error line-clamp-2 mb-2">
            {article.error}
          </p>
          {!isRunning && (
            <button
              onClick={onRetry}
              className="text-xs text-scai-brand1 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry generation
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      {article.status === "complete" && article.html && (
        <div className="flex gap-2">
          <button
            onClick={onPreview}
            className="flex-1 py-2 bg-scai-input border border-scai-border rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-scai-surface transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          {showValidation && onValidate && (
            <button
              onClick={onValidate}
              className="flex-1 py-2 bg-scai-input border border-scai-border rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-scai-surface transition-colors"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              Validate
            </button>
          )}
          <button
            onClick={onDownload}
            className="flex-1 py-2 bg-scai-input border border-scai-border rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-scai-surface transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </div>
      )}
    </motion.div>
  );
}

function StatusIcon({ status }: { status: ArticleProgress["status"] }) {
  switch (status) {
    case "pending":
      return <Clock className="w-5 h-5 text-scai-text-muted flex-shrink-0" />;
    case "generating":
      return (
        <Loader2 className="w-5 h-5 text-scai-brand1 animate-spin flex-shrink-0" />
      );
    case "complete":
      return <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />;
    case "error":
      return <XCircle className="w-5 h-5 text-error flex-shrink-0" />;
  }
}
