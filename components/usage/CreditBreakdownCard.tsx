"use client";

import { Coins } from "lucide-react";

export interface CreditSummaryTableProps {
  tier: "free" | "pro";
  monthlyUsed?: number;
  monthlyLimit?: number;
  monthlyResetsAt?: string;
  paygBalance?: number;
}

// Keep old name as alias for backwards compat
export type CreditBreakdownCardProps = CreditSummaryTableProps;

export function CreditSummaryTable({
  tier,
  monthlyUsed = 0,
  monthlyLimit = 100,
  monthlyResetsAt,
  paygBalance = 0,
}: CreditSummaryTableProps) {
  const isPro = tier === "pro";

  const formatNumber = (n: number) => n.toLocaleString();

  const formatResetDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatTimeUntilReset = (dateStr?: string) => {
    if (!dateStr) return "—";
    const now = new Date();
    const reset = new Date(dateStr);
    const diff = reset.getTime() - now.getTime();

    if (diff <= 0) return "Soon";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `in ${hours}h`;
    const days = Math.floor(hours / 24);
    return `in ${days}d`;
  };

  type Row = {
    type: string;
    used: string;
    limit: string;
    remaining: string;
    resets: string;
  };

  const rows: Row[] = isPro
    ? [
        {
          type: "Monthly",
          used: formatNumber(monthlyUsed),
          limit: formatNumber(monthlyLimit),
          remaining: formatNumber(monthlyLimit - monthlyUsed),
          resets: formatResetDate(monthlyResetsAt),
        },
        {
          type: "Add-on",
          used: "—",
          limit: "—",
          remaining: formatNumber(paygBalance),
          resets: "Never",
        },
      ]
    : [
        {
          type: "Monthly",
          used: formatNumber(monthlyUsed),
          limit: formatNumber(monthlyLimit),
          remaining: formatNumber(monthlyLimit - monthlyUsed),
          resets: formatResetDate(monthlyResetsAt),
        },
      ];

  return (
    <div className="rounded-xl border border-scai-border-bright bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-scai-border">
        <div className="p-2 rounded-lg bg-scai-brand1/10">
          <Coins className="w-4 h-4 text-scai-brand1" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-scai-text">
            Credit Summary
          </h3>
          <p className="text-xs text-scai-text-sec">
            Your current credit allocation and usage
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-scai-border">
              <th className="text-left text-xs font-medium text-scai-text-sec py-3 px-5">
                Credit Type
              </th>
              <th className="text-right text-xs font-medium text-scai-text-sec py-3 px-5">
                Used
              </th>
              <th className="text-right text-xs font-medium text-scai-text-sec py-3 px-5">
                Limit
              </th>
              <th className="text-right text-xs font-medium text-scai-text-sec py-3 px-5">
                Remaining
              </th>
              <th className="text-right text-xs font-medium text-scai-text-sec py-3 px-5">
                Resets
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.type}
                className="border-b border-scai-border last:border-0 hover:bg-scai-border/30 transition-colors"
              >
                <td className="py-3 px-5">
                  <span className="text-sm font-medium text-scai-text">
                    {row.type}
                  </span>
                </td>
                <td className="py-3 px-5 text-right">
                  <span className="text-sm text-scai-text-sec tabular-nums">
                    {row.used}
                  </span>
                </td>
                <td className="py-3 px-5 text-right">
                  <span className="text-sm text-scai-text-sec tabular-nums">
                    {row.limit}
                  </span>
                </td>
                <td className="py-3 px-5 text-right">
                  <span className="text-sm font-medium text-scai-text tabular-nums">
                    {row.remaining}
                  </span>
                </td>
                <td className="py-3 px-5 text-right">
                  <span className="text-sm text-scai-text-sec">
                    {row.resets}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upgrade nudge for free tier */}
      {!isPro && (
        <div className="px-5 py-3 border-t border-scai-border">
          <div className="rounded-lg bg-gradient-to-r from-scai-brand1/10 to-scai-brand2/10 border border-scai-brand1/20 p-3">
            <p className="text-sm text-scai-text mb-1">
              Want more credits?
            </p>
            <p className="text-xs text-scai-text-sec">
              Upgrade to Pro for 2,000 credits/month, bulk generation, and Gemini images.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Keep old export name as alias
export const CreditBreakdownCard = CreditSummaryTable;
