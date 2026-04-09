"use client";

import { useState, useEffect } from "react";
import { ComponentDefinition } from "@/data/components";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

interface VariationModalProps {
  component: ComponentDefinition | null;
  isOpen: boolean;
  onClose: () => void;
}

type Device = "desktop" | "tablet" | "mobile";

/**
 * VariationModal
 * Full-screen modal for viewing component variations
 * Now powered by Radix Dialog for better accessibility
 */
export default function VariationModal({
  component,
  isOpen,
  onClose,
}: VariationModalProps) {
  const [currentVariation, setCurrentVariation] = useState(0);
  const [device, setDevice] = useState<Device>("desktop");

  // Reset variation when component changes
  useEffect(() => {
    setCurrentVariation(0);
  }, [component?.id]);

  if (!component) return null;

  const variationNames = ["Clean", "Styled", "Enhanced"];
  const totalVariations = component.variations;

  const getDeviceWidth = () => {
    switch (device) {
      case "mobile":
        return 375;
      case "tablet":
        return 768;
      default:
        return 1024;
    }
  };

  // Placeholder preview content
  const getPreviewContent = () => {
    return `
      <div style="padding: 40px; font-family: Inter, sans-serif;">
        <div style="margin-bottom: 20px; padding: 12px; background: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
          <strong style="color: #166534;">Variation ${currentVariation + 1}: ${
      variationNames[currentVariation]
    }</strong>
        </div>
        <h2 style="font-size: 24px; margin-bottom: 16px; color: #111;">${
          component.name
        }</h2>
        <p style="color: #374151; line-height: 1.6;">
          This is a preview of the <strong>${
            variationNames[currentVariation]
          }</strong> variation. 
          In the full application, this will show the actual rendered HTML component with proper styling.
        </p>
        <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px dashed #d1d5db;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Component ID: <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${
              component.id
            }</code>
          </p>
        </div>
      </div>
    `;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-6xl h-[90vh] p-0 flex flex-col"
        showClose={false}
      >
        {/* Header */}
        <DialogHeader className="flex-row items-center justify-between px-6 py-4 border-b border-scai-border bg-scai-surface space-y-0">
          <div>
            <DialogTitle className="text-xl font-bold">
              {component.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-scai-text-sec mt-1">
              {component.description}
            </DialogDescription>
          </div>

          <div className="flex items-center gap-4">
            {/* Variation selector */}
            <div className="flex items-center gap-1 bg-scai-input rounded-xl p-1 border border-scai-border">
              {Array.from({ length: totalVariations }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentVariation(i)}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    i === currentVariation
                      ? "bg-scai-brand1 text-scai-page"
                      : "text-scai-text-sec hover:text-scai-text hover:bg-scai-surface/50"
                  }`}
                >
                  {variationNames[i]}
                </button>
              ))}
            </div>

            {/* Device selector */}
            <TooltipProvider>
              <div className="flex items-center gap-1 bg-scai-input rounded-xl p-1 border border-scai-border">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setDevice("desktop")}
                      className={`p-2 rounded-lg transition-all ${
                        device === "desktop"
                          ? "bg-scai-surface text-scai-brand1"
                          : "text-scai-text-muted"
                      }`}
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Desktop</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setDevice("tablet")}
                      className={`p-2 rounded-lg transition-all ${
                        device === "tablet"
                          ? "bg-scai-surface text-scai-brand1"
                          : "text-scai-text-muted"
                      }`}
                    >
                      <Tablet className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Tablet</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setDevice("mobile")}
                      className={`p-2 rounded-lg transition-all ${
                        device === "mobile"
                          ? "bg-scai-surface text-scai-brand1"
                          : "text-scai-text-muted"
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Mobile</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-scai-text-muted hover:text-scai-text"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Preview area */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-scai-page p-10 relative">
          {/* Navigation arrows */}
          <button
            type="button"
            onClick={() => setCurrentVariation((prev) => Math.max(0, prev - 1))}
            disabled={currentVariation === 0}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center bg-scai-surface border border-scai-border text-scai-text-sec hover:text-scai-brand1 hover:border-scai-brand1 hover:scale-110 active:scale-95 transition-all disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() =>
              setCurrentVariation((prev) =>
                Math.min(totalVariations - 1, prev + 1)
              )
            }
            disabled={currentVariation === totalVariations - 1}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center bg-scai-surface border border-scai-border text-scai-text-sec hover:text-scai-brand1 hover:border-scai-brand1 hover:scale-110 active:scale-95 transition-all disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Device frame */}
          <div
            className={`bg-white shadow-card transition-all duration-300 ${
              device === "mobile" ? "rounded-[40px]" : "rounded-xl"
            }`}
            style={{
              width: getDeviceWidth(),
              maxHeight: "100%",
              overflow: "auto",
              boxShadow:
                device === "mobile"
                  ? "0 0 0 12px #222, 0 0 0 16px #333"
                  : "0 0 0 2px #222",
            }}
          >
            {/* Mobile notch */}
            {device === "mobile" && (
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-24 h-6 rounded-full bg-black" />
              </div>
            )}

            {/* Content */}
            <div
              className="article-preview-container"
              dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-scai-border bg-scai-surface flex justify-between items-center">
          <div className="flex gap-1.5">
            {Array.from({ length: totalVariations }).map((_, i) => (
              <button
                type="button"
                key={i}
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === currentVariation
                    ? "w-8 bg-scai-brand1 shadow-glow"
                    : "w-2 bg-scai-border hover:bg-scai-border-bright cursor-pointer hover:scale-125"
                }`}
                onClick={() => setCurrentVariation(i)}
              />
            ))}
          </div>
          <p className="text-sm text-scai-text-muted">
            Variation {currentVariation + 1} of {totalVariations}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
