"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

export interface UsageDataPoint {
  date: string;
  credits: number;
}

interface UsageGraphProps {
  className?: string;
}

type Period = "7d" | "30d";

export function UsageGraph({ className }: UsageGraphProps) {
  const [period, setPeriod] = useState<Period>("7d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UsageDataPoint[]>([]);
  const [totalUsed, setTotalUsed] = useState(0);

  useEffect(() => {
    const fetchUsageHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/usage/history?period=${period}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data || []);
          // Calculate total credits used in period
          const total = (json.data || []).reduce(
            (sum: number, d: UsageDataPoint) => sum + d.credits,
            0
          );
          setTotalUsed(total);
        }
      } catch (error) {
        console.error("Failed to fetch usage history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsageHistory();
  }, [period]);

  // Y-axis ticks in steps of 50
  const yTicks = useMemo(() => {
    const maxVal = Math.max(...data.map((d) => d.credits), 0);
    const top = Math.ceil(maxVal / 50) * 50 || 50;
    const ticks: number[] = [];
    for (let i = 0; i <= top; i += 50) ticks.push(i);
    return ticks;
  }, [data]);

  // Format date for X-axis
  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Format number for tooltip
  const formatCredits = (value: number) => value.toLocaleString();

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length && label) {
      return (
        <div className="rounded-lg border border-scai-border-bright bg-[#0a0a0a] px-3 py-2 shadow-lg">
          <p className="text-xs text-scai-text-sec mb-1">{formatXAxis(label)}</p>
          <p className="text-sm font-semibold text-scai-text">
            {formatCredits(payload[0].value)} credits
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`rounded-xl border border-scai-border-bright bg-[#0a0a0a] p-5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-sm font-medium text-scai-text mb-1">
            Credits Used
          </h4>
          <p className="text-2xl font-semibold text-scai-text">
            {formatCredits(totalUsed)}
          </p>
          <p className="text-xs text-scai-text-sec">
            in the last {period === "7d" ? "7 days" : "30 days"}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex rounded-lg border border-scai-border overflow-hidden">
          <button
            onClick={() => setPeriod("7d")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              period === "7d"
                ? "bg-scai-border text-scai-text"
                : "text-scai-text-sec hover:text-scai-text"
            }`}
          >
            7 days
          </button>
          <button
            onClick={() => setPeriod("30d")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              period === "30d"
                ? "bg-scai-border text-scai-text"
                : "text-scai-text-sec hover:text-scai-text"
            }`}
          >
            30 days
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-scai-brand1" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-scai-text-sec">
            No usage data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#40EDC3" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#40EDC3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(34,34,34,0.6)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke="#666666"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis
                stroke="#666666"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                ticks={yTicks}
                domain={[0, yTicks[yTicks.length - 1]]}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                }
                dx={-8}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="credits"
                stroke="#40EDC3"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCredits)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
