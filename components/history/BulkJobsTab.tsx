"use client";

import { motion } from "motion/react";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Layers,
  Hash,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useBulkJobs, type BulkJob } from "@/lib/hooks/queries";
import { formatCost } from "@/lib/services/cost-tracking-service";

export function BulkJobsTab() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useBulkJobs();

  const jobs = data?.jobs ?? [];

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      completed: "bg-green-500/10 text-green-500 border-green-500/20",
      running: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      queued: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      failed: "bg-red-500/10 text-red-500 border-red-500/20",
      cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    };

    return (
      <span
        className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
          colors[status as keyof typeof colors] || colors.pending
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-scai-brand1 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Error Loading Bulk Jobs</h3>
        <p className="text-scai-text-sec mb-4">
          {error instanceof Error ? error.message : "Failed to load bulk jobs"}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-scai-brand1 text-scai-page rounded-lg hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-scai-input flex items-center justify-center mx-auto mb-4">
          <Layers className="w-8 h-8 text-scai-text-muted" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Bulk Articles Yet</h3>
        <p className="text-scai-text-sec">
          Generate articles in bulk from the Bulk Generate page
        </p>
      </div>
    );
  }

  return (
    <div className="bg-scai-card border border-scai-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-scai-surface border-b border-scai-border">
              <th className="px-4 py-3 text-left text-xs font-medium text-scai-text-sec uppercase tracking-wide">
                Topic
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-scai-text-sec uppercase tracking-wide">
                Articles
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-scai-text-sec uppercase tracking-wide">
                Words
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-scai-text-sec uppercase tracking-wide">
                Cost
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-scai-text-sec uppercase tracking-wide">
                Status
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
            {jobs.map((job: BulkJob) => (
              <motion.tr
                key={job.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-scai-surface/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-scai-text-muted flex-shrink-0" />
                    <span className="font-medium truncate max-w-[200px]">
                      {job.keyword || `Batch (${job.totalArticles} articles)`}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-scai-text-sec">
                  <div className="flex items-center gap-2">
                    <span>{job.stats.total}</span>
                    <div className="flex items-center gap-1 text-xs">
                      {job.stats.complete > 0 && (
                        <span className="flex items-center gap-0.5 text-green-500">
                          <CheckCircle className="w-3 h-3" />
                          {job.stats.complete}
                        </span>
                      )}
                      {job.stats.error > 0 && (
                        <span className="flex items-center gap-0.5 text-red-500">
                          <XCircle className="w-3 h-3" />
                          {job.stats.error}
                        </span>
                      )}
                      {job.stats.pending > 0 && (
                        <span className="flex items-center gap-0.5 text-scai-text-muted">
                          <Clock className="w-3 h-3" />
                          {job.stats.pending}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-scai-text-sec">
                  <div className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {job.stats.totalWords.toLocaleString()}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {job.stats.totalCostMicroDollars > 0 ? (
                    <span className="text-scai-brand1 font-medium">
                      {formatCost(job.stats.totalCostMicroDollars)}
                    </span>
                  ) : (
                    <span className="text-scai-text-muted">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3 text-sm text-scai-text-sec">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(job.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      onClick={() => router.push(`/history/bulk/${job.id}`)}
                      variant="secondary"
                      size="sm"
                      title="View articles"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
