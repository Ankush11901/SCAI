"use client";

import { HelpCircle } from "lucide-react";
import { motion } from "motion/react";

interface TourTriggerButtonProps {
  onClick: () => void;
}

export function TourTriggerButton({ onClick }: TourTriggerButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-scai-border bg-scai-card shadow-card text-scai-text-muted hover:text-scai-brand1 hover:border-scai-brand1/50 transition-colors"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title="Restart tour"
      aria-label="Restart page tour"
    >
      <HelpCircle className="h-5 w-5" />
    </motion.button>
  );
}
