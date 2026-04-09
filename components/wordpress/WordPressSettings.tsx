"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Download,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { WordPressIcon } from "./WordPressIcon";
import { PluginInstallGuide } from "./PluginInstallGuide";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  useWordPressConnections,
  useInitiateWordPressConnect,
  useDisconnectWordPress,
  useVerifyWordPress,
  useCheckPlugin,
  useInstallPlugin,
  useVerifyPlugin,
  useInvalidateQueries,
} from "@/lib/hooks/queries";
import type { WordPressConnectionInfo } from "@/lib/hooks/queries";

export function WordPressSettings() {
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [connecting, setConnecting] = useState(false);

  const { data: connections, isLoading } = useWordPressConnections();
  const connectMutation = useInitiateWordPressConnect();
  const disconnectMutation = useDisconnectWordPress();
  const verifyMutation = useVerifyWordPress();
  const checkPlugin = useCheckPlugin();
  const installPlugin = useInstallPlugin();
  const verifyPlugin = useVerifyPlugin();
  const { invalidateWordPress } = useInvalidateQueries();

  const [verifyResults, setVerifyResults] = useState<
    Record<string, "healthy" | "unhealthy" | "checking">
  >({});
  const [manualWizardOpen, setManualWizardOpen] = useState<
    Record<string, boolean>
  >({});
  const [disconnectTarget, setDisconnectTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Listen for postMessage from the OAuth callback popup
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data?.type === "wordpress-connected") {
        setConnecting(false);
        setShowConnectForm(false);
        setSiteUrl("");
        invalidateWordPress();
        toast.success("WordPress site connected successfully!");
      } else if (event.data?.type === "wordpress-error") {
        setConnecting(false);
        toast.error("WordPress authorization failed. Please try again.");
      }
    },
    [invalidateWordPress]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const handleConnect = async () => {
    if (!siteUrl) {
      toast.error("Please enter your WordPress site URL");
      return;
    }

    // Normalize URL
    let normalizedUrl = siteUrl.trim();
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    normalizedUrl = normalizedUrl.replace(/\/+$/, "");

    try {
      setConnecting(true);
      const authUrl = await connectMutation.mutateAsync(normalizedUrl);

      // Open WordPress authorization in a centered popup
      const w = 600, h = 700;
      const left = Math.round((screen.width - w) / 2);
      const top = Math.round((screen.height - h) / 2);
      const popup = window.open(
        authUrl,
        "wp-auth",
        `width=${w},height=${h},left=${left},top=${top},popup=yes,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no`
      );

      // If popup was blocked, fall back to redirect
      if (!popup) {
        toast.error("Popup blocked. Please allow popups for this site.");
        setConnecting(false);
        return;
      }

      // Poll for popup closure (in case user closes without completing)
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          // Give a moment for the postMessage to arrive
          setTimeout(() => setConnecting(false), 1000);
        }
      }, 500);
    } catch (err) {
      setConnecting(false);
      const msg = err instanceof Error ? err.message : "Connection failed";
      toast.error(msg);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;

    try {
      await disconnectMutation.mutateAsync(disconnectTarget.id);
      toast.success("Site disconnected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Disconnect failed";
      toast.error(msg);
    } finally {
      setDisconnectTarget(null);
    }
  };

  const handleCheckPlugin = async (id: string) => {
    try {
      const result = await checkPlugin.mutateAsync(id);
      if (result.pluginInstalled) {
        toast.success(`Plugin active (v${result.pluginVersion || "?"})`);
      } else if (result.canRestInstall) {
        toast("Plugin not installed. Click 'Install Plugin' to install automatically.", { duration: 5000 });
      } else {
        toast("Plugin not installed. Manual install required via wp-admin.", { duration: 5000 });
      }
    } catch {
      toast.error("Failed to check plugin status");
    }
  };

  const handleInstallPlugin = async (id: string) => {
    try {
      const result = await installPlugin.mutateAsync({ connectionId: id });
      if (result.success) {
        toast.success(`Plugin installed (v${result.version || "?"})`);
      } else {
        toast.error(result.error || "Install failed — try manual install");
      }
    } catch {
      toast.error("Plugin install failed");
    }
  };

  const handleVerifyPlugin = async (id: string) => {
    try {
      const result = await verifyPlugin.mutateAsync(id);
      if (result.installed) {
        toast.success(`Plugin verified (v${result.version || "?"})`);
      } else {
        toast.error("Plugin not detected. Make sure it is activated in wp-admin.");
      }
    } catch {
      toast.error("Plugin verification failed");
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyResults((prev) => ({ ...prev, [id]: "checking" }));
    try {
      const healthy = await verifyMutation.mutateAsync(id);
      setVerifyResults((prev) => ({
        ...prev,
        [id]: healthy ? "healthy" : "unhealthy",
      }));
      if (healthy) {
        toast.success("Connection is healthy");
      } else {
        toast.error(
          "Connection check failed — the site may be unreachable or the app password may have been revoked"
        );
      }
    } catch {
      setVerifyResults((prev) => ({ ...prev, [id]: "unhealthy" }));
      toast.error("Verification failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Connected Sites */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-scai-text-muted" />
        </div>
      ) : connections && connections.length > 0 ? (
        <div className="space-y-3">
          {connections.map((conn: WordPressConnectionInfo) => (
            <motion.div
              key={conn.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-3 p-3 rounded-lg bg-scai-surface border ${
                conn.pluginStatus === "active"
                  ? "border-green-500/30"
                  : "border-scai-border"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  conn.pluginStatus === "active"
                    ? "bg-green-500/10"
                    : "bg-[#21759b]/10"
                }`}
              >
                {conn.pluginStatus === "active" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <WordPressIcon className="w-4 h-4 text-[#21759b]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-scai-text truncate">
                    {conn.siteName || conn.siteUrl}
                  </p>
                  {conn.pluginStatus === "active" && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500 whitespace-nowrap">
                      Ready
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-scai-text-muted truncate">
                    {conn.siteUrl}
                    {conn.username && ` · ${conn.username}`}
                  </p>
                  {/* Plugin status badge */}
                  {conn.pluginStatus === "active" && (
                    <span className="text-[10px] text-scai-text-muted whitespace-nowrap">
                      Plugin v{conn.pluginVersion || "?"}
                    </span>
                  )}
                  {conn.pluginStatus === "not_installed" && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 whitespace-nowrap">
                      No Plugin
                    </span>
                  )}
                  {conn.pluginStatus === "installing" && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 whitespace-nowrap">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Installing...
                    </span>
                  )}
                  {conn.pluginStatus === "blocked" && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-600 whitespace-nowrap">
                      <XCircle className="w-3 h-3" />
                      Blocked
                    </span>
                  )}
                  {(!conn.pluginStatus || conn.pluginStatus === "not_checked") && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-500/10 text-scai-text-muted whitespace-nowrap">
                      Not Checked
                    </span>
                  )}
                </div>
                {/* Plugin action buttons */}
                {conn.pluginStatus !== "active" && (
                  <div className="mt-2 space-y-2.5">
                    <div className="flex items-center gap-2">
                      {/* Primary CTA based on status */}
                      {(!conn.pluginStatus || conn.pluginStatus === "not_checked") && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleCheckPlugin(conn.id)}
                          isLoading={checkPlugin.isPending}
                          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                        >
                          Check Plugin Status
                        </Button>
                      )}
                      {conn.pluginStatus === "not_installed" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleInstallPlugin(conn.id)}
                          isLoading={installPlugin.isPending}
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                        >
                          Auto-Install Plugin
                        </Button>
                      )}

                      {/* Secondary: Re-check */}
                      {(conn.pluginStatus === "not_installed" || conn.pluginStatus === "blocked") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerifyPlugin(conn.id)}
                          isLoading={verifyPlugin.isPending}
                        >
                          Re-check
                        </Button>
                      )}
                    </div>

                    {/* Manual install wizard toggle + wizard */}
                    {(conn.pluginStatus === "not_installed" || conn.pluginStatus === "blocked") && (
                      <div>
                        {conn.pluginStatus === "blocked" ? (
                          <PluginInstallGuide
                            connectionId={conn.id}
                            siteUrl={conn.siteUrl}
                          />
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setManualWizardOpen((prev) => ({
                                  ...prev,
                                  [conn.id]: !prev[conn.id],
                                }))
                              }
                              className="inline-flex items-center gap-1.5 text-xs text-scai-text-sec hover:text-scai-brand1 transition-colors"
                            >
                              Or install manually
                              <ChevronDown
                                className={cn(
                                  "w-3.5 h-3.5 transition-transform duration-200",
                                  manualWizardOpen[conn.id] && "rotate-180"
                                )}
                              />
                            </button>
                            <AnimatePresence>
                              {manualWizardOpen[conn.id] && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-2">
                                    <PluginInstallGuide
                                      connectionId={conn.id}
                                      siteUrl={conn.siteUrl}
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Connection status indicator */}
              {verifyResults[conn.id] === "checking" && (
                <Loader2 className="w-4 h-4 animate-spin text-scai-text-muted" />
              )}
              {verifyResults[conn.id] === "healthy" && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              {verifyResults[conn.id] === "unhealthy" && (
                <XCircle className="w-4 h-4 text-red-500" />
              )}

              {/* Actions */}
              <button
                onClick={() => handleVerify(conn.id)}
                className="p-1.5 rounded-lg text-scai-text-sec hover:text-scai-brand1 hover:bg-scai-brand1/10 transition-colors"
                title="Verify connection"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <a
                href={`${conn.siteUrl}/wp-admin`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-scai-text-sec hover:text-scai-brand1 hover:bg-scai-brand1/10 transition-colors"
                title="Open WP Admin"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setDisconnectTarget({ id: conn.id, name: conn.siteName || conn.siteUrl })}
                className="p-1.5 rounded-lg text-scai-text-sec hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Disconnect"
                disabled={disconnectMutation.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-scai-text-muted text-sm">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No WordPress sites connected</p>
        </div>
      )}

      {/* Connect Form */}
      <AnimatePresence>
        {showConnectForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 p-4 rounded-lg border border-scai-border bg-scai-surface">
              <p className="text-sm text-scai-text-sec">
                Enter your WordPress site URL. You&apos;ll be redirected to
                approve the connection in your WordPress admin panel.
              </p>
              <Input
                label="Site URL"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://yoursite.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConnect();
                }}
              />
              <div className="flex gap-2 pt-1">
                <Button
                  variant="primary"
                  onClick={handleConnect}
                  disabled={connecting || !siteUrl}
                  className="flex-1"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Waiting for approval...
                    </>
                  ) : (
                    <>
                      <WordPressIcon className="w-4 h-4 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowConnectForm(false);
                    setConnecting(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Site Button */}
      {!showConnectForm && (
        <Button
          variant="ghost"
          onClick={() => setShowConnectForm(true)}
          className="w-full border border-dashed border-scai-border hover:border-scai-brand1/50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Connect WordPress Site
        </Button>
      )}

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={!!disconnectTarget}
        onOpenChange={(open) => {
          if (!open) setDisconnectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Site</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect{" "}
              <strong className="text-scai-text">{disconnectTarget?.name}</strong>?
              You can reconnect it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDisconnectTarget(null)}
              disabled={disconnectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDisconnect}
              isLoading={disconnectMutation.isPending}
              className="bg-red-600 hover:bg-red-700 border-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
