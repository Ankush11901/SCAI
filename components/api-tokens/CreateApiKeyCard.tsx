"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Key, Plus, Copy, Check, Shield, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

export interface CreateApiKeyCardProps {
  onCreateKey?: (name: string, scopes?: string[]) => void;
  isLoading?: boolean;
  availableScopes?: { id: string; label: string; description?: string }[];
  className?: string;
}

const defaultScopes = [
  { id: "generate", label: "Generate Articles", description: "Create new articles via API" },
  { id: "read", label: "Read Articles", description: "Fetch existing articles" },
  { id: "usage", label: "View Usage", description: "Access usage statistics" },
];

export function CreateApiKeyCard({
  onCreateKey,
  isLoading = false,
  availableScopes = defaultScopes,
  className,
}: CreateApiKeyCardProps) {
  const [keyName, setKeyName] = React.useState("");
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>(["generate", "read"]);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const handleScopeToggle = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId)
        ? prev.filter((id) => id !== scopeId)
        : [...prev, scopeId]
    );
  };

  const handleCreate = () => {
    if (keyName.trim()) {
      onCreateKey?.(keyName.trim(), selectedScopes);
    }
  };

  const isValid = keyName.trim().length >= 3;

  return (
    <div className={cn("p-6 rounded-xl border border-scai-border bg-scai-card", className)}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-scai-brand1/10 flex items-center justify-center flex-shrink-0">
          <Key className="w-6 h-6 text-scai-brand1" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-scai-text">
            Create New API Key
          </h3>
          <p className="text-sm text-scai-text-sec mt-1">
            Generate a new API key for programmatic access to SCAI services.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Key name input */}
        <div>
          <label className="block text-sm font-medium text-scai-text mb-2">
            Key Name
          </label>
          <input
            type="text"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="e.g., Production API Key"
            className="w-full px-4 py-2.5 rounded-lg border border-scai-border bg-scai-surface text-scai-text placeholder:text-scai-text-sec focus:outline-none focus:ring-2 focus:ring-scai-brand1/30 focus:border-scai-brand1 transition-all"
          />
          <p className="text-xs text-scai-text-sec mt-1.5">
            Use a descriptive name to identify this key&apos;s purpose
          </p>
        </div>

        {/* Advanced options toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-scai-text-sec hover:text-scai-text transition-colors"
        >
          <Shield className="w-4 h-4" />
          <span>Advanced: Configure Scopes</span>
          <motion.span
            animate={{ rotate: showAdvanced ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▾
          </motion.span>
        </button>

        {/* Scopes selection */}
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-lg border border-scai-border bg-scai-surface space-y-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-scai-text-sec" />
              <span className="text-xs text-scai-text-sec">
                Select which actions this API key can perform
              </span>
            </div>
            {availableScopes.map((scope) => (
              <label
                key={scope.id}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={selectedScopes.includes(scope.id)}
                  onChange={() => handleScopeToggle(scope.id)}
                  className="mt-0.5 w-4 h-4 rounded border-scai-border bg-scai-page text-scai-brand1 focus:ring-scai-brand1/30"
                />
                <div>
                  <p className="text-sm font-medium text-scai-text group-hover:text-scai-brand1 transition-colors">
                    {scope.label}
                  </p>
                  {scope.description && (
                    <p className="text-xs text-scai-text-sec">
                      {scope.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </motion.div>
        )}

        {/* Security notice */}
        <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-scai-text-sec">
              <span className="font-medium text-warning">Security Notice:</span>{" "}
              API keys provide access to your account. Keep them secure and never share them publicly.
              You can revoke keys at any time.
            </p>
          </div>
        </div>

        {/* Create button */}
        <Button
          variant="primary"
          className="w-full"
          onClick={handleCreate}
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Generate API Key
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
