"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Download,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Check,
  Power,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useVerifyPlugin } from "@/lib/hooks/queries";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

const STEPS = [
  { label: "Download", icon: Download },
  { label: "Upload", icon: ExternalLink },
  { label: "Activate", icon: Power },
  { label: "Verify", icon: ShieldCheck },
] as const;

interface PluginInstallGuideProps {
  connectionId: string;
  siteUrl: string;
  onInstallComplete?: () => void;
}

export function PluginInstallGuide({
  connectionId,
  siteUrl,
  onInstallComplete,
}: PluginInstallGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    new Set()
  );
  const [verifyResult, setVerifyResult] = useState<
    "idle" | "success" | "failed"
  >("idle");

  const verifyPlugin = useVerifyPlugin();
  const wpAdminUploadUrl = `${siteUrl}/wp-admin/plugin-install.php?tab=upload`;

  const completeStep = useCallback(
    (step: number) => {
      setCompletedSteps((prev) => new Set([...prev, step]));
    },
    []
  );

  const advanceTo = useCallback(
    (step: number) => {
      completeStep(step - 1);
      setCurrentStep(step);
    },
    [completeStep]
  );

  const handleDownloadClick = () => {
    completeStep(0);
    setTimeout(() => setCurrentStep(1), 1500);
  };

  const handleOpenWp = () => {
    advanceTo(2);
  };

  const handleActivated = () => {
    advanceTo(3);
  };

  const handleVerify = async () => {
    setVerifyResult("idle");
    try {
      const result = await verifyPlugin.mutateAsync(connectionId);
      if (result.installed) {
        setVerifyResult("success");
        completeStep(3);
        toast.success(`Plugin verified (v${result.version || "?"})`);
        onInstallComplete?.();
      } else {
        setVerifyResult("failed");
        toast.error(
          "Plugin not detected yet. Make sure it is activated in WordPress."
        );
      }
    } catch {
      setVerifyResult("failed");
      toast.error("Verification failed. Check your connection.");
    }
  };

  const getStepStatus = (index: number) => {
    if (completedSteps.has(index)) return "completed";
    if (currentStep === index) return "current";
    return "pending";
  };

  const handleStepClick = (index: number) => {
    if (completedSteps.has(index) || index === currentStep) {
      setCurrentStep(index);
    }
  };

  return (
    <div className="space-y-4">
      {/* Horizontal step indicator */}
      <div className="flex items-center">
        {STEPS.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <div key={step.label} className="flex items-center flex-1 last:flex-initial">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <motion.button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors",
                    status === "completed" &&
                      "bg-scai-brand1 border-scai-brand1 cursor-pointer",
                    status === "current" &&
                      "border-scai-brand1 bg-scai-brand1/10",
                    status === "pending" &&
                      "border-scai-border bg-scai-input cursor-default"
                  )}
                  animate={
                    status === "current"
                      ? { scale: [1, 1.08, 1] }
                      : { scale: 1 }
                  }
                  transition={
                    status === "current"
                      ? {
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }
                      : undefined
                  }
                >
                  <AnimatePresence mode="wait">
                    {status === "completed" ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 45 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 25,
                        }}
                      >
                        <Check className="w-3.5 h-3.5 text-scai-page" />
                      </motion.div>
                    ) : (
                      <motion.span
                        key="number"
                        className={cn(
                          "text-xs font-semibold",
                          status === "current"
                            ? "text-scai-brand1"
                            : "text-scai-text-muted"
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {index + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
                <span
                  className={cn(
                    "text-[10px] font-medium whitespace-nowrap",
                    status === "completed" && "text-scai-brand1",
                    status === "current" && "text-scai-text",
                    status === "pending" && "text-scai-text-muted"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1.5 mt-[-18px] rounded-full transition-colors duration-500",
                    completedSteps.has(index)
                      ? "bg-scai-brand1"
                      : "bg-scai-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="rounded-lg p-4 border border-scai-border/50 bg-scai-surface/30"
        >
          {/* Step 0: Download */}
          {currentStep === 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-scai-text">
                Download the SCAI plugin
              </p>
              <p className="text-xs text-scai-text-sec">
                Save the plugin zip file to your computer.
              </p>
              <a
                href="/seo-content-ai.zip"
                download="seo-content-ai.zip"
                onClick={handleDownloadClick}
                className={cn(
                  "flex w-full items-center justify-center gap-2 font-medium transition-colors",
                  "relative overflow-hidden",
                  "bg-gradient-primary text-scai-page font-semibold hover:opacity-90 shadow-glow",
                  "px-3 py-1.5 text-sm rounded-lg",
                  completedSteps.has(0) && "opacity-70"
                )}
              >
                <Download className="w-3.5 h-3.5" />
                {completedSteps.has(0)
                  ? "Downloaded — moving on..."
                  : "Download seo-content-ai.zip"}
              </a>
            </div>
          )}

          {/* Step 1: Upload */}
          {currentStep === 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-scai-text">
                Upload to WordPress
              </p>
              <p className="text-xs text-scai-text-sec">
                Open your WordPress admin and upload the zip file you just
                downloaded. Click{" "}
                <strong className="text-scai-text">Install Now</strong> after
                selecting it.
              </p>
              <a
                href={wpAdminUploadUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOpenWp}
                className={cn(
                  "inline-flex items-center justify-center gap-2 font-medium transition-colors",
                  "relative overflow-hidden",
                  "bg-gradient-primary text-scai-page font-semibold hover:opacity-90 shadow-glow",
                  "px-3 py-1.5 text-sm rounded-lg"
                )}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Plugin Upload
              </a>
            </div>
          )}

          {/* Step 2: Activate */}
          {currentStep === 2 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-scai-text">
                Activate the plugin
              </p>
              <p className="text-xs text-scai-text-sec">
                After WordPress finishes installing, click{" "}
                <strong className="text-scai-text">
                  Activate Plugin
                </strong>{" "}
                on the WordPress screen. Then come back here.
              </p>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                onClick={handleActivated}
              >
                I&apos;ve activated it
              </Button>
            </div>
          )}

          {/* Step 3: Verify */}
          {currentStep === 3 && (
            <div className="space-y-2">
              {verifyResult === "success" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-500">
                      Plugin installed and verified!
                    </p>
                    <p className="text-xs text-green-500/80">
                      Your WordPress site is ready for article exports.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <>
                  <p className="text-sm font-medium text-scai-text">
                    Verify the connection
                  </p>
                  <p className="text-xs text-scai-text-sec">
                    Let us confirm the plugin is active and connected to
                    your site.
                  </p>
                  {verifyResult === "failed" && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400">
                        Plugin not detected. Make sure it&apos;s activated in
                        WordPress, then try again.
                      </p>
                    </div>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                    onClick={handleVerify}
                    isLoading={verifyPlugin.isPending}
                  >
                    Verify Connection
                  </Button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
