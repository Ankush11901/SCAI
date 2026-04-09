"use client";

import { ComponentDefinition } from "@/data/components";
import { Layers, ChevronRight } from "lucide-react";

interface VariationCardProps {
  component: ComponentDefinition;
  onClick: () => void;
  index?: number;
}

/**
 * VariationCard
 * Card showing component info with variation preview
 * Uses CSS transitions for better performance
 */
export default function VariationCard({
  component,
  onClick,
}: VariationCardProps) {
  return (
    <button
      onClick={onClick}
      className="group bg-scai-card border border-scai-border rounded-xl p-5 text-left 
        hover:border-scai-brand1 hover:-translate-y-1 hover:shadow-glow
        active:scale-[0.98] active:translate-y-0
        transition-all duration-200 ease-out"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-scai-surface border border-scai-border flex items-center justify-center">
            <Layers className="w-5 h-5 text-scai-text-sec" />
          </div>
          <div>
            <h3 className="font-semibold text-scai-text">{component.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  component.type === "universal"
                    ? "bg-scai-brand1/10 text-scai-brand1"
                    : "bg-purple-500/10 text-purple-400"
                }`}
              >
                {component.type}
              </span>
              {component.required && (
                <span className="text-xs text-scai-text-muted">Required</span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-scai-text-muted group-hover:text-scai-brand1 transition-colors" />
      </div>

      <p className="text-sm text-scai-text-sec mb-4">{component.description}</p>

      {/* Variation preview indicators */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-scai-text-muted">
          {component.variations} variations
        </span>
        <div className="flex gap-1">
          {Array.from({ length: component.variations }).map((_, i) => (
            <div
              key={i}
              className="w-6 h-1 rounded-full bg-scai-surface group-hover:bg-scai-brand1/30 transition-colors"
            />
          ))}
        </div>
      </div>
    </button>
  );
}
