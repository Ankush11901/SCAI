"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Receipt, ArrowDown, ArrowUp, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface CreditTransaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string;
}

export interface CreditTransactionTableProps {
  className?: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  generation: { label: "Generation", color: "text-info bg-info/10" },
  image: { label: "Image", color: "text-info bg-info/10" },
  topup: { label: "Top-up", color: "text-success bg-success/10" },
  refund: { label: "Refund", color: "text-warning bg-warning/10" },
  reset: { label: "Reset", color: "text-scai-text-sec bg-scai-surface" },
  adjustment: { label: "Adjustment", color: "text-scai-text-sec bg-scai-surface" },
  subscription: { label: "Subscription", color: "text-success bg-success/10" },
};

const PAGE_SIZE = 5;

export function CreditTransactionTable({ className }: CreditTransactionTableProps) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetchTransactions = useCallback(async (loadMore = false) => {
    if (loadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({ type: "transactions" });
      if (loadMore && cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/billing/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        const items = data.transactions?.items || [];
        setHasMore(data.transactions?.hasMore || false);
        if (items.length > 0) {
          setCursor(items[items.length - 1].id);
        }
        if (loadMore) {
          setTransactions((prev) => [...prev, ...items]);
        } else {
          setTransactions(items);
        }
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor]);

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const paginatedTransactions = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // When navigating to last page and there's more server data, fetch it
  const handleNextPage = async () => {
    const nextPage = page + 1;
    const needsMore = (nextPage + 1) * PAGE_SIZE > transactions.length && hasMore;
    if (needsMore) {
      await fetchTransactions(true);
    }
    setPage(nextPage);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Compute effective total pages after any pending load
  const effectiveTotalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const canGoNext = page < effectiveTotalPages - 1 || hasMore;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={`rounded-xl border border-scai-border-bright bg-[#0a0a0a] overflow-hidden ${className || ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-scai-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-scai-brand2/10">
            <Receipt className="w-4 h-4 text-scai-brand2" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-scai-text">
              Credit Transactions
            </h3>
            <p className="text-xs text-scai-text-sec">
              Recent credit activity on your account
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-scai-brand1" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-scai-text-muted">
          <Receipt className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">No credit transactions yet</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-scai-border text-scai-text-sec">
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Type</th>
                  <th className="text-right px-5 py-3 font-medium">Amount</th>
                  <th className="text-left px-5 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((tx) => {
                  const typeInfo = TYPE_CONFIG[tx.type] || TYPE_CONFIG.adjustment;
                  const isPositive = tx.amount > 0;
                  return (
                    <tr
                      key={tx.id}
                      className="border-b border-scai-border/50 hover:bg-scai-surface/30 transition-colors"
                    >
                      <td className="px-5 py-3 text-scai-text-sec whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-medium tabular-nums ${
                            isPositive ? "text-success" : "text-error"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )}
                          {isPositive ? "+" : ""}
                          {tx.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-scai-text-sec max-w-[200px] truncate">
                        {tx.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(totalPages > 1 || hasMore) && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-scai-border">
              <span className="text-xs text-scai-text-muted">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, transactions.length)} of {hasMore ? `${transactions.length}+` : transactions.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg hover:bg-scai-surface text-scai-text-sec hover:text-scai-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-scai-text-sec px-2">
                  {loadingMore ? (
                    <Loader2 className="w-3 h-3 animate-spin inline" />
                  ) : (
                    `${page + 1} / ${hasMore ? `${effectiveTotalPages}+` : effectiveTotalPages}`
                  )}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={!canGoNext || loadingMore}
                  className="p-1.5 rounded-lg hover:bg-scai-surface text-scai-text-sec hover:text-scai-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
