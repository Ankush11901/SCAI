"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";

interface SettingsCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
  children: React.ReactNode;
  className?: string;
}

export function SettingsCard({
  icon,
  title,
  description,
  delay,
  children,
  className,
}: SettingsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn("bg-[#0a0a0a] rounded-xl border border-scai-border-bright overflow-hidden", className)}
    >
      <div className="px-6 py-4 flex items-center gap-3">
        <div className="p-2 bg-scai-brand1/10 rounded-lg">{icon}</div>
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          <p className="text-sm text-scai-text-sec">{description}</p>
        </div>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </motion.div>
  );
}
