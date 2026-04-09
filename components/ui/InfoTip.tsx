"use client";

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

interface InfoTipProps {
  text: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function InfoTip({ text, side = "top" }: InfoTipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="ml-1 inline-flex cursor-help align-middle"
            tabIndex={-1}
          >
            <HelpCircle className="h-3.5 w-3.5 text-scai-text-muted transition-colors hover:text-scai-text-sec" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-[220px] text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
