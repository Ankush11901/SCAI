"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { toast } from "sonner";

export function OverageCapSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overageData, setOverageData] = useState<{
    available: boolean;
    currentCap: number | null;
    overageUsed: number;
    overageRemaining: number | null;
    costSoFar: string;
  } | null>(null);
  const [capValue, setCapValue] = useState("");
  const [isUnlimited, setIsUnlimited] = useState(false);

  useEffect(() => {
    const fetchOverage = async () => {
      try {
        const res = await fetch("/api/billing/overage-cap");
        if (res.ok) {
          const data = await res.json();
          setOverageData(data);
          if (data.currentCap === null) {
            setIsUnlimited(true);
            setCapValue("");
          } else {
            setIsUnlimited(false);
            setCapValue(String(data.currentCap));
          }
        }
      } catch (error) {
        console.error("Failed to fetch overage cap:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOverage();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const cap = isUnlimited ? null : Number(capValue) || 0;
      const res = await fetch("/api/billing/overage-cap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cap }),
      });

      if (res.ok) {
        const data = await res.json();
        setOverageData((prev) =>
          prev
            ? {
                ...prev,
                currentCap: data.currentCap,
                overageUsed: data.overageUsed,
                overageRemaining: data.overageRemaining,
              }
            : prev
        );
        toast.success("Overage cap updated");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update overage cap");
      }
    } catch (error) {
      console.error("Failed to save overage cap:", error);
      toast.error("Failed to update overage cap");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !overageData?.available) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-scai-border-bright bg-[#0a0a0a] p-5"
    >
      <h3 className="text-sm font-semibold text-scai-text mb-1">
        Spending Limit
      </h3>
      <p className="text-xs text-scai-text-sec mb-4">
        Set a cap on extra credits beyond your monthly allowance. Overage is billed at $0.05/credit.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="p-3 rounded-lg bg-scai-surface border border-scai-border">
          <p className="text-xs text-scai-text-muted mb-1">Cap</p>
          <p className="text-sm font-medium text-scai-text">
            {overageData.currentCap === null
              ? "Unlimited"
              : `${overageData.currentCap.toLocaleString()} credits`}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-scai-surface border border-scai-border">
          <p className="text-xs text-scai-text-muted mb-1">Used</p>
          <p className="text-sm font-medium text-scai-text">
            {overageData.overageUsed.toLocaleString()} credits
          </p>
        </div>
        <div className="p-3 rounded-lg bg-scai-surface border border-scai-border">
          <p className="text-xs text-scai-text-muted mb-1">Cost so far</p>
          <p className="text-sm font-medium text-scai-text">
            {overageData.costSoFar || "$0.00"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={isUnlimited}
            onCheckedChange={(checked) => {
              setIsUnlimited(checked);
              if (checked) setCapValue("");
            }}
          />
          <span className="text-xs text-scai-text-sec">Unlimited</span>
        </div>

        {!isUnlimited && (
          <div className="relative flex items-center">
            <input
              type="number"
              value={capValue}
              onChange={(e) => setCapValue(e.target.value)}
              placeholder="e.g. 500"
              className="h-9 w-32 rounded-lg border border-scai-border bg-scai-input pl-3 pr-7 text-sm text-scai-text placeholder:text-scai-text-muted focus:outline-none focus:border-scai-brand1 focus:ring-2 focus:ring-scai-brand1/20 transition-all"
            />
            <div className="absolute right-0 inset-y-0 flex flex-col border-l border-scai-border">
              <button
                type="button"
                onClick={() => setCapValue(String(Math.max(0, (Number(capValue) || 0) + 50)))}
                className="flex-1 flex items-center justify-center px-1.5 text-scai-text-muted hover:text-scai-brand1 hover:bg-scai-surface rounded-tr-lg transition-colors"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setCapValue(String(Math.max(0, (Number(capValue) || 0) - 50)))}
                className="flex-1 flex items-center justify-center px-1.5 text-scai-text-muted hover:text-scai-brand1 hover:bg-scai-surface rounded-br-lg transition-colors"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Save
        </Button>
      </div>
    </motion.div>
  );
}
