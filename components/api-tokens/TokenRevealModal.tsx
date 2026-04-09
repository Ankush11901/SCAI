"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Key, Copy, Check, AlertTriangle, Eye, EyeOff, Shield } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";

export interface TokenRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyName: string;
  token: string;
  onCopied?: () => void;
  className?: string;
}

export function TokenRevealModal({
  isOpen,
  onClose,
  keyName,
  token,
  onCopied,
  className,
}: TokenRevealModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);
  const [acknowledged, setAcknowledged] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setRevealed(false);
      setAcknowledged(false);
    }
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 3000);
    } catch {
      console.error("Failed to copy token");
    }
  };

  const maskedToken = token.slice(0, 12) + "•".repeat(Math.max(0, token.length - 16)) + token.slice(-4);

  const handleClose = () => {
    if (copied || acknowledged) {
      onClose();
    } else {
      setAcknowledged(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-lg", className)}>
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-scai-brand1/10 flex items-center justify-center mb-4">
            <Key className="w-6 h-6 text-scai-brand1" />
          </div>
          <DialogTitle>API Key Created</DialogTitle>
          <DialogDescription>
            Your new API key <strong className="text-scai-text">{keyName}</strong> has been generated.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Warning banner */}
          <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">
                  Save this token now
                </p>
                <p className="text-xs text-scai-text-sec mt-1">
                  This is the only time you&apos;ll see this token. Copy it and store it securely.
                  You won&apos;t be able to view it again.
                </p>
              </div>
            </div>
          </div>

          {/* Token display */}
          <div className="p-4 rounded-xl border border-scai-border bg-scai-surface">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-scai-text">Your API Key</span>
              <button
                onClick={() => setRevealed(!revealed)}
                className="flex items-center gap-1.5 text-xs text-scai-text-sec hover:text-scai-text transition-colors"
              >
                {revealed ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reveal</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="relative">
              <code
                className={cn(
                  "block w-full p-3 rounded-lg bg-scai-page border border-scai-border font-mono text-sm break-all",
                  revealed ? "text-scai-text" : "text-scai-text-sec"
                )}
              >
                {revealed ? token : maskedToken}
              </code>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopy}
                className={cn(
                  "absolute top-2 right-2 p-2 rounded-lg transition-all",
                  copied
                    ? "bg-scai-brand1/10 text-scai-brand1"
                    : "bg-scai-surface hover:bg-scai-border text-scai-text-sec hover:text-scai-text"
                )}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </motion.button>
            </div>

            {copied && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-scai-brand1 mt-2 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Copied to clipboard
              </motion.p>
            )}
          </div>

          {/* Security tips */}
          <div className="p-4 rounded-xl border border-scai-border bg-scai-card">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-scai-text-sec" />
              <span className="text-sm font-medium text-scai-text">Security Tips</span>
            </div>
            <ul className="space-y-2 text-xs text-scai-text-sec">
              <li className="flex items-start gap-2">
                <span className="text-scai-brand1">•</span>
                Store this key in a secure password manager or secrets vault
              </li>
              <li className="flex items-start gap-2">
                <span className="text-scai-brand1">•</span>
                Never commit API keys to version control or share them publicly
              </li>
              <li className="flex items-start gap-2">
                <span className="text-scai-brand1">•</span>
                Use environment variables to store keys in your applications
              </li>
              <li className="flex items-start gap-2">
                <span className="text-scai-brand1">•</span>
                Rotate keys periodically and revoke any that may be compromised
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {!copied && !acknowledged && (
            <p className="text-xs text-center text-warning">
              Please copy your token before closing this dialog
            </p>
          )}
          
          <Button
            variant="primary"
            onClick={handleClose}
            className="w-full"
          >
            {copied ? (
              "Done"
            ) : acknowledged ? (
              "Close Without Copying"
            ) : (
              "I've Saved My Token"
            )}
          </Button>
          
          {!copied && !acknowledged && (
            <Button
              variant="secondary"
              onClick={handleCopy}
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Token
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
