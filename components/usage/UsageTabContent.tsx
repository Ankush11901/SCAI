"use client";

import { Loader2 } from "lucide-react";
import { UsageGraph, CreditSummaryTable } from "@/components/usage";
import { OverageCapSection } from "@/components/billing";
import { useQuota } from "@/lib/hooks/queries";

export function UsageTabContent() {
  const { data: usageData, isLoading } = useQuota();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-scai-brand1" />
      </div>
    );
  }

  const quota = usageData?.quota;
  const credits = usageData?.credits;
  const isPro = quota?.unlimited || !!credits?.monthly || false;

  return (
    <div className="space-y-6">
      {/* Usage Graph */}
      <UsageGraph />

      {/* Spending Limit — Pro only */}
      {isPro && <OverageCapSection />}

      {/* Credit Summary */}
      <CreditSummaryTable
        tier={isPro ? "pro" : "free"}
        monthlyUsed={credits?.monthly?.used}
        monthlyLimit={credits?.monthly?.limit}
        monthlyResetsAt={credits?.monthly?.resetsAt ?? quota?.resetsAt}
        paygBalance={credits?.payg?.balance}
      />
    </div>
  );
}
