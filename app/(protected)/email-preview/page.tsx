"use client";

import { useState } from "react";
import { Mail, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import {
  generateBulkCompletionEmail,
  getPreviewEmailData,
  type BulkCompletionEmailData,
} from "@/lib/emails/bulk-completion";

type EmailStatus = "success" | "partial" | "failed";

export default function EmailPreviewPage() {
  const [selectedStatus, setSelectedStatus] = useState<EmailStatus>("success");
  const [customData, setCustomData] = useState<Partial<BulkCompletionEmailData>>({});

  // Get email data based on selected status
  const emailData = {
    ...getPreviewEmailData(selectedStatus),
    ...customData,
  };

  // Generate email HTML
  const emailHtml = generateBulkCompletionEmail(emailData);

  const statusOptions: { value: EmailStatus; label: string; icon: React.ReactNode; description: string }[] = [
    {
      value: "success",
      label: "Success",
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      description: "All articles completed successfully",
    },
    {
      value: "partial",
      label: "Partial",
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      description: "Some articles failed",
    },
    {
      value: "failed",
      label: "Failed",
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      description: "All articles failed",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-scai-brand1/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-scai-brand1" />
          </div>
          Email Preview
        </h1>
        <p className="text-scai-text-sec mt-1">
          Preview how bulk completion emails will look to users
        </p>
      </div>

      {/* Status Selector */}
      <div className="bg-scai-card border border-scai-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Email Status</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedStatus === option.value
                  ? "border-scai-brand1 bg-scai-brand1/5"
                  : "border-scai-border hover:border-scai-text-muted"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {option.icon}
                <span className="font-semibold">{option.label}</span>
              </div>
              <p className="text-sm text-scai-text-sec">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Customization */}
      <div className="bg-scai-card border border-scai-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Customize Preview</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-scai-text-sec mb-1">
              User Name
            </label>
            <input
              type="text"
              value={customData.userName || emailData.userName}
              onChange={(e) =>
                setCustomData({ ...customData, userName: e.target.value })
              }
              className="w-full px-3 py-2 bg-scai-input border border-scai-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-scai-brand1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-scai-text-sec mb-1">
              Keyword
            </label>
            <input
              type="text"
              value={customData.keyword || emailData.keyword || ""}
              onChange={(e) =>
                setCustomData({ ...customData, keyword: e.target.value })
              }
              className="w-full px-3 py-2 bg-scai-input border border-scai-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-scai-brand1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-scai-text-sec mb-1">
              Completed
            </label>
            <input
              type="number"
              min={0}
              value={customData.completedArticles ?? emailData.completedArticles}
              onChange={(e) =>
                setCustomData({
                  ...customData,
                  completedArticles: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 bg-scai-input border border-scai-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-scai-brand1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-scai-text-sec mb-1">
              Total Words
            </label>
            <input
              type="number"
              min={0}
              value={customData.totalWords ?? emailData.totalWords ?? 0}
              onChange={(e) =>
                setCustomData({
                  ...customData,
                  totalWords: parseInt(e.target.value) || undefined,
                })
              }
              className="w-full px-3 py-2 bg-scai-input border border-scai-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-scai-brand1"
            />
          </div>
        </div>
      </div>

      {/* Email Preview */}
      <div className="bg-scai-card border border-scai-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-scai-border bg-scai-surface">
          <h2 className="text-lg font-semibold">Email Preview</h2>
          <div className="flex items-center gap-2 text-sm text-scai-text-sec">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="ml-2">inbox@example.com</span>
          </div>
        </div>

        {/* Email metadata */}
        <div className="px-6 py-4 border-b border-scai-border bg-scai-surface/50">
          <div className="grid gap-2 text-sm">
            <div className="flex gap-3">
              <span className="font-medium text-scai-text-sec w-16">From:</span>
              <span>SCAI &lt;onboarding@resend.dev&gt;</span>
            </div>
            <div className="flex gap-3">
              <span className="font-medium text-scai-text-sec w-16">Subject:</span>
              <span className="font-medium">
                {selectedStatus === "failed"
                  ? "Your Bulk Generation Failed"
                  : selectedStatus === "partial"
                  ? `Bulk Generation Complete: ${emailData.completedArticles}/${emailData.totalArticles} Articles Ready`
                  : `Your ${emailData.totalArticles} Articles Are Ready!`}
              </span>
            </div>
          </div>
        </div>

        {/* Email content iframe */}
        <div className="bg-gray-100 p-4">
          <iframe
            srcDoc={emailHtml}
            title="Email Preview"
            className="w-full h-[800px] bg-white rounded-lg shadow-lg"
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      {/* Raw HTML (collapsible) */}
      <details className="bg-scai-card border border-scai-border rounded-xl overflow-hidden">
        <summary className="px-6 py-4 cursor-pointer font-semibold hover:bg-scai-surface transition-colors">
          View Raw HTML
        </summary>
        <div className="px-6 pb-6">
          <pre className="bg-scai-input p-4 rounded-lg overflow-x-auto text-xs">
            <code>{emailHtml}</code>
          </pre>
        </div>
      </details>
    </div>
  );
}
