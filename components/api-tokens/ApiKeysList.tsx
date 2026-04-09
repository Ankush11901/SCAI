"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Key,
  Copy,
  Check,
  Trash2,
  MoreHorizontal,
  Clock,
  Activity,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";

export interface ApiKey {
  id: string;
  name: string;
  prefix: string; // e.g., "sk_live_****1234"
  createdAt: Date;
  lastUsedAt?: Date;
  scopes?: string[];
  status: "active" | "revoked" | "expired";
}

export interface ApiKeysListProps {
  keys: ApiKey[];
  onRevoke?: (keyId: string) => void;
  onCopyPrefix?: (prefix: string) => void;
  onDelete?: (keyId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function ApiKeysList({
  keys,
  onRevoke,
  onCopyPrefix,
  onDelete,
  isLoading = false,
  className,
}: ApiKeysListProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const handleCopy = (key: ApiKey) => {
    navigator.clipboard.writeText(key.prefix);
    setCopiedId(key.id);
    onCopyPrefix?.(key.prefix);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (keyId: string) => {
    if (confirmDeleteId === keyId) {
      onDelete?.(keyId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(keyId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(date);
  };

  const getStatusBadge = (status: ApiKey["status"]) => {
    const styles = {
      active: "bg-scai-brand1/10 text-scai-brand1",
      revoked: "bg-error/10 text-error",
      expired: "bg-scai-text-sec/10 text-scai-text-sec",
    };

    const labels = {
      active: "Active",
      revoked: "Revoked",
      expired: "Expired",
    };

    return (
      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", styles[status])}>
        {labels[status]}
      </span>
    );
  };

  if (keys.length === 0) {
    return (
      <div className={cn("p-8 rounded-xl border border-scai-border bg-scai-card text-center", className)}>
        <div className="w-16 h-16 rounded-2xl bg-scai-surface flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8 text-scai-text-sec" />
        </div>
        <h3 className="text-base font-semibold text-scai-text mb-2">
          No API Keys Yet
        </h3>
        <p className="text-sm text-scai-text-sec max-w-sm mx-auto">
          Create your first API key to start integrating SCAI with your applications.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <AnimatePresence>
        {keys.map((key, index) => (
          <motion.div
            key={key.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "p-4 rounded-xl border bg-scai-card transition-all",
              key.status === "active"
                ? "border-scai-border hover:border-scai-text-sec/30"
                : "border-scai-border/50 opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Key info */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  key.status === "active"
                    ? "bg-scai-brand1/10"
                    : "bg-scai-surface"
                )}>
                  <Key className={cn(
                    "w-5 h-5",
                    key.status === "active" ? "text-scai-brand1" : "text-scai-text-sec"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-scai-text truncate">
                      {key.name}
                    </h4>
                    {getStatusBadge(key.status)}
                  </div>
                  
                  {/* Key prefix with copy */}
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-xs text-scai-text-sec bg-scai-surface px-2 py-1 rounded font-mono">
                      {key.prefix}
                    </code>
                    <button
                      onClick={() => handleCopy(key)}
                      className="p-1 rounded hover:bg-scai-surface transition-colors text-scai-text-sec hover:text-scai-text"
                      title="Copy key prefix"
                    >
                      {copiedId === key.id ? (
                        <Check className="w-3.5 h-3.5 text-scai-brand1" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-scai-text-sec">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Created {formatRelativeTime(key.createdAt)}</span>
                    </div>
                    {key.lastUsedAt && (
                      <div className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" />
                        <span>Last used {formatRelativeTime(key.lastUsedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Scopes */}
                  {key.scopes && key.scopes.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="px-2 py-0.5 rounded bg-scai-surface text-xs text-scai-text-sec"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {key.status === "active" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRevoke?.(key.id)}
                    className="text-warning hover:text-warning hover:bg-warning/10"
                  >
                    Revoke
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-scai-surface transition-colors text-scai-text-sec hover:text-scai-text">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCopy(key)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Prefix
                    </DropdownMenuItem>
                    {key.status === "active" && (
                      <DropdownMenuItem onClick={() => onRevoke?.(key.id)}>
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Revoke Key
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleDelete(key.id)}
                      className="text-error focus:text-error"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {confirmDeleteId === key.id ? "Confirm Delete" : "Delete"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Delete confirmation warning */}
            <AnimatePresence>
              {confirmDeleteId === key.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-3 rounded-lg bg-error/5 border border-error/20"
                >
                  <div className="flex items-center gap-2 text-xs text-error">
                    <AlertCircle className="w-4 h-4" />
                    <span>Click delete again to permanently remove this key</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
