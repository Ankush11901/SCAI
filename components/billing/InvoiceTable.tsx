"use client";

import { useState } from "react";
import { CheckCircle2, Clock, XCircle, RotateCcw, FileText, Download, ChevronLeft, ChevronRight } from "lucide-react";

export interface Invoice {
  id: string;
  number?: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed" | "refunded";
  pdfUrl?: string;
}

export interface InvoiceTableProps {
  invoices: Invoice[];
  onDownload?: (invoiceId: string) => void;
}

const PAGE_SIZE = 5;

export function InvoiceTable({ invoices, onDownload }: InvoiceTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
  const paginatedInvoices = invoices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatAmount = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const StatusBadge = ({ status }: { status: Invoice["status"] }) => {
    const config = {
      paid: {
        icon: CheckCircle2,
        className: "text-success",
        label: "Paid",
      },
      pending: {
        icon: Clock,
        className: "text-warning",
        label: "Pending",
      },
      failed: {
        icon: XCircle,
        className: "text-error",
        label: "Failed",
      },
      refunded: {
        icon: RotateCcw,
        className: "text-scai-text-sec",
        label: "Refunded",
      },
    };

    const { icon: Icon, className, label } = config[status];

    return (
      <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
        <Icon className="w-4 h-4" />
        {label}
      </span>
    );
  };

  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-scai-border-bright bg-[#0a0a0a] p-6">
        <h3 className="text-lg font-bold text-scai-text">Billing History</h3>
        <p className="text-sm text-scai-text-sec mt-1 mb-6">
          Your past subscription bill payment history
        </p>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 rounded-full bg-scai-border mb-3">
            <FileText className="w-5 h-5 text-scai-text-sec" />
          </div>
          <p className="text-sm text-scai-text-sec">No billing history yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-scai-border-bright bg-[#0a0a0a] overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-lg font-bold text-scai-text">Billing History</h3>
        <p className="text-sm text-scai-text-sec mt-1">
          Your past subscription bill payment history
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-scai-border">
              <th className="text-left text-xs font-medium text-scai-text-sec py-3 px-6">
                Invoice
              </th>
              <th className="text-left text-xs font-medium text-scai-text-sec py-3 px-6">
                Amount
              </th>
              <th className="text-left text-xs font-medium text-scai-text-sec py-3 px-6">
                Status
              </th>
              <th className="text-left text-xs font-medium text-scai-text-sec py-3 px-6">
                Date
              </th>
              <th className="text-right text-xs font-medium text-scai-text-sec py-3 px-6">
                &nbsp;
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedInvoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="border-b border-scai-border last:border-0 hover:bg-scai-border/30 transition-colors"
              >
                <td className="py-3 px-6">
                  <span className="text-sm text-scai-text">
                    {invoice.number}
                  </span>
                </td>
                <td className="py-3 px-6">
                  <span className="text-sm font-medium text-scai-text">
                    {formatAmount(invoice.amount)}
                  </span>
                </td>
                <td className="py-3 px-6">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="py-3 px-6">
                  <span className="text-sm text-scai-text-sec">
                    {formatDate(invoice.date)}
                  </span>
                </td>
                <td className="py-3 px-6 text-right">
                  {invoice.pdfUrl && (
                    <button
                      onClick={() => onDownload?.(invoice.id)}
                      className="p-1 rounded hover:bg-scai-border/50 text-scai-text-sec hover:text-scai-text transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-scai-border">
          <span className="text-xs text-scai-text-muted">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, invoices.length)} of {invoices.length}
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
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-scai-surface text-scai-text-sec hover:text-scai-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
