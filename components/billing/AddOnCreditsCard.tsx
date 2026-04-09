"use client";

import { Button } from "@/components/ui/Button";
import { Coins, Plus } from "lucide-react";

export interface AddOnCreditsCardProps {
  balance: number;
  onBuyMore?: () => void;
}

export function AddOnCreditsCard({ balance, onBuyMore }: AddOnCreditsCardProps) {
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div className="rounded-xl border border-scai-border-bright bg-[#0a0a0a] p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-scai-text">Add-on Credits</h4>
        <div className="p-1.5 rounded-lg bg-scai-brand1/10">
          <Coins className="w-4 h-4 text-scai-brand1" />
        </div>
      </div>

      <div className="mb-3">
        <p className="text-2xl font-semibold text-scai-text">
          {formatNumber(balance)}
        </p>
        <p className="text-xs text-scai-text-sec">Credits (never expire)</p>
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={onBuyMore}
      >
        <Plus className="w-4 h-4 mr-1" />
        Buy More
      </Button>
    </div>
  );
}
