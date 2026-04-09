"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  Unplug,
  Settings2,
  Globe,
  Plug,
  XCircle,
  RefreshCw,
  Download,
  ChevronDown,
  MoreHorizontal,
  Search,
  ArrowLeft,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";
import { CMSPlatformIcon } from "./CMSIcons";
import { WordPressIcon } from "@/components/wordpress/WordPressIcon";
import { PluginInstallGuide } from "@/components/wordpress/PluginInstallGuide";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  useCMSConnections,
  useCreateCMSConnection,
  useDeleteCMSConnection,
  useVerifyCMSCredentials,
} from "@/lib/hooks/useCMSConnections";
import {
  useWordPressConnections,
  useInitiateWordPressConnect,
  useDisconnectWordPress,
  useVerifyWordPress,
  useCheckPlugin,
  useInstallPlugin,
  useVerifyPlugin,
  useInvalidateQueries,
  type WordPressConnectionInfo,
} from "@/lib/hooks/queries";
import { CMS_PLATFORMS, type CMSPlatform, type CMSPlatformConfig, type CMSCredentials } from "@/lib/services/cms/types";

// ─── Constants ──────────────────────────────────────────────────────────────

type UnifiedPlatform = CMSPlatformConfig | { id: 'wordpress'; name: string; description: string; color: string; bgColor: string };

const WORDPRESS_PLATFORM = {
  id: 'wordpress' as const,
  name: 'WordPress',
  description: 'Publish directly to your WordPress site',
  color: '#FFFFFF',
  bgColor: '#21759b',
};

const ALL_PLATFORMS: UnifiedPlatform[] = [WORDPRESS_PLATFORM, ...CMS_PLATFORMS];

const PLUGIN_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:        { label: "Ready",       className: "bg-success/10 text-success" },
  not_installed: { label: "No Plugin",   className: "bg-warning/10 text-warning" },
  blocked:       { label: "Blocked",     className: "bg-error/10 text-error" },
  not_checked:   { label: "Not Checked", className: "bg-scai-surface text-scai-text-sec" },
  installing:    { label: "Installing",  className: "bg-info/10 text-info" },
};

function formatDate(val: string | Date) {
  const d = val instanceof Date ? val : new Date(val);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Shared Sub-components ──────────────────────────────────────────────────

function ConnectionStatusBadge({ type, pluginStatus }: { type: 'wordpress' | 'cms'; pluginStatus?: string | null }) {
  if (type === 'cms') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
        <span className="w-1.5 h-1.5 rounded-full bg-success" />
        Connected
      </span>
    );
  }
  const cfg = PLUGIN_STATUS_CONFIG[pluginStatus || 'not_checked'];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", cfg.className)}>
      {pluginStatus === 'installing' && <Loader2 className="w-3 h-3 animate-spin" />}
      {pluginStatus === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
      {cfg.label}
    </span>
  );
}

// ─── WordPress Plugin Dialog ────────────────────────────────────────────────

function WordPressPluginDialog({
  conn,
  open,
  onOpenChange,
}: {
  conn: WordPressConnectionInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [manualWizardOpen, setManualWizardOpen] = useState(false);
  const checkPlugin = useCheckPlugin();
  const installPlugin = useInstallPlugin();
  const verifyPlugin = useVerifyPlugin();

  const handleCheckPlugin = async () => {
    try {
      const result = await checkPlugin.mutateAsync(conn.id);
      if (result.pluginInstalled) {
        toast.success(`Plugin active (v${result.pluginVersion || "?"})`);
      } else if (result.canRestInstall) {
        toast("Plugin not installed. Click 'Auto-Install' to install automatically.", { duration: 5000 });
      } else {
        toast("Plugin not installed. Manual install required via wp-admin.", { duration: 5000 });
      }
    } catch {
      toast.error("Failed to check plugin status");
    }
  };

  const handleInstallPlugin = async () => {
    try {
      const result = await installPlugin.mutateAsync({ connectionId: conn.id });
      if (result.success) {
        toast.success(`Plugin installed (v${result.version || "?"})`);
      } else {
        toast.error(result.error || "Install failed — try manual install");
      }
    } catch {
      toast.error("Plugin install failed");
    }
  };

  const handleVerifyPlugin = async () => {
    try {
      const result = await verifyPlugin.mutateAsync(conn.id);
      if (result.installed) {
        toast.success(`Plugin verified (v${result.version || "?"})`);
      } else {
        toast.error("Plugin not detected. Make sure it is activated in wp-admin.");
      }
    } catch {
      toast.error("Plugin verification failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#21759b]/10">
              <WordPressIcon className="w-5 h-5 text-[#21759b]" />
            </div>
            <div>
              <DialogTitle>Manage Plugin</DialogTitle>
              <DialogDescription className="mt-0.5">
                {conn.siteName || conn.siteUrl}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-scai-text-sec">Status:</span>
            <ConnectionStatusBadge type="wordpress" pluginStatus={conn.pluginStatus} />
            {conn.pluginStatus === "active" && conn.pluginVersion && (
              <span className="text-xs text-scai-text-muted">v{conn.pluginVersion}</span>
            )}
          </div>

          {conn.pluginStatus !== "active" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(!conn.pluginStatus || conn.pluginStatus === "not_checked") && (
                  <Button variant="primary" size="sm" onClick={handleCheckPlugin} isLoading={checkPlugin.isPending} leftIcon={<RefreshCw className="w-3.5 h-3.5" />} className="w-full col-span-2">
                    Check Plugin Status
                  </Button>
                )}
                {conn.pluginStatus === "not_installed" && (
                  <Button variant="primary" size="sm" onClick={handleInstallPlugin} isLoading={installPlugin.isPending} leftIcon={<Download className="w-3.5 h-3.5" />} className="w-full">
                    Auto-Install Plugin
                  </Button>
                )}
                {(conn.pluginStatus === "not_installed" || conn.pluginStatus === "blocked") && (
                  <Button variant="secondary" size="sm" onClick={handleVerifyPlugin} isLoading={verifyPlugin.isPending} className="w-full">
                    Re-check
                  </Button>
                )}
              </div>

              {(conn.pluginStatus === "not_installed" || conn.pluginStatus === "blocked") && (
                <div>
                  {conn.pluginStatus === "blocked" ? (
                    <PluginInstallGuide connectionId={conn.id} siteUrl={conn.siteUrl} />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setManualWizardOpen(!manualWizardOpen)}
                        className="inline-flex items-center gap-1.5 text-xs text-scai-text-sec hover:text-scai-brand1 transition-colors"
                      >
                        Or install manually
                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", manualWizardOpen && "rotate-180")} />
                      </button>
                      <AnimatePresence>
                        {manualWizardOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2">
                              <PluginInstallGuide connectionId={conn.id} siteUrl={conn.siteUrl} />
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
      </DialogContent>
    </Dialog>
  );
}

// ─── Table Row Components ───────────────────────────────────────────────────

function WordPressTableRow({
  conn,
  onDisconnect,
}: {
  conn: WordPressConnectionInfo;
  onDisconnect: (id: string, name: string) => void;
}) {
  const [verifyResult, setVerifyResult] = useState<"healthy" | "unhealthy" | "checking" | null>(null);
  const [pluginDialogOpen, setPluginDialogOpen] = useState(false);
  const verifyMutation = useVerifyWordPress();
  const needsPlugin = conn.pluginStatus !== "active";

  const handleVerify = async () => {
    setVerifyResult("checking");
    try {
      const healthy = await verifyMutation.mutateAsync(conn.id);
      setVerifyResult(healthy ? "healthy" : "unhealthy");
      toast[healthy ? "success" : "error"](healthy ? "Connection is healthy" : "Connection check failed");
    } catch {
      setVerifyResult("unhealthy");
      toast.error("Verification failed");
    }
  };

  return (
    <>
      <tr className={cn(
        "hover:bg-scai-surface/30 transition-colors",
        needsPlugin ? "" : "border-b border-scai-border/50"
      )}>
        {/* Platform */}
        <td className="px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg flex-shrink-0 bg-[#21759b]/10">
              <WordPressIcon className="w-4 h-4 text-[#21759b]" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-scai-text truncate text-sm">WordPress</p>
              <p className="text-xs text-scai-text-muted truncate">{conn.siteName || conn.siteUrl}</p>
            </div>
          </div>
        </td>
        {/* URL */}
        <td className="px-5 py-3">
          <a href={conn.siteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-scai-text-sec hover:text-scai-brand1 truncate block max-w-[200px]">
            {conn.siteUrl.replace(/^https?:\/\//, "")}
          </a>
        </td>
        {/* Status */}
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            <ConnectionStatusBadge type="wordpress" pluginStatus={conn.pluginStatus} />
            {verifyResult === "checking" && <Loader2 className="w-3 h-3 animate-spin text-scai-text-muted" />}
            {verifyResult === "healthy" && <CheckCircle2 className="w-3 h-3 text-success" />}
            {verifyResult === "unhealthy" && <XCircle className="w-3 h-3 text-error" />}
          </div>
        </td>
        {/* Added */}
        <td className="px-5 py-3 text-scai-text-sec whitespace-nowrap text-xs">
          {formatDate(conn.createdAt)}
        </td>
        {/* Actions */}
        <td className="px-3 py-3 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-scai-surface transition-colors text-scai-text-sec hover:text-scai-text">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleVerify}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Verify Connection
              </DropdownMenuItem>
              {needsPlugin && (
                <DropdownMenuItem onClick={() => setPluginDialogOpen(true)}>
                  <Settings2 className="w-4 h-4 mr-2" />
                  Manage Plugin
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <a href={`${conn.siteUrl}/wp-admin`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open WP Admin
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDisconnect(conn.id, conn.siteName || conn.siteUrl)} className="text-error focus:text-error">
                <Trash2 className="w-4 h-4 mr-2" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      {/* Inline plugin setup banner — always visible when plugin not active */}
      {needsPlugin && (
        <tr className="border-b border-scai-border/50">
          <td colSpan={5} className="px-5 py-0">
            <div className="py-3 pl-10">
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-warning/10 mt-0.5">
                    <Download className="w-4 h-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-scai-text">
                      Plugin Required
                    </p>
                    <p className="text-xs text-scai-text-sec mt-0.5">
                      Install the SEO Content AI plugin on your WordPress site to enable styled article exports with design variations.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setPluginDialogOpen(true)}
                    leftIcon={<Settings2 className="w-3.5 h-3.5" />}
                  >
                    Set Up Plugin
                  </Button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}

      <WordPressPluginDialog conn={conn} open={pluginDialogOpen} onOpenChange={setPluginDialogOpen} />
    </>
  );
}

function CMSTableRow({
  conn,
  config,
  onDisconnect,
}: {
  conn: { id: string; name: string; platform: string; metadata: { blogUrl?: string } | null; createdAt: Date };
  config: CMSPlatformConfig | undefined;
  onDisconnect: () => void;
}) {
  const blogUrl = conn.metadata?.blogUrl;

  return (
    <tr className="border-b border-scai-border/50 last:border-0 hover:bg-scai-surface/30 transition-colors">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: config?.bgColor || '#333' }}>
            <CMSPlatformIcon platform={conn.platform as CMSPlatform} className="w-4 h-4" />
          </div>
          <p className="font-medium text-scai-text truncate text-sm">{conn.name}</p>
        </div>
      </td>
      <td className="px-5 py-3">
        {blogUrl ? (
          <a href={blogUrl.startsWith('http') ? blogUrl : `https://${blogUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs text-scai-text-sec hover:text-scai-brand1 truncate block max-w-[200px]">
            {blogUrl.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <span className="text-xs text-scai-text-muted">{config?.name || conn.platform}</span>
        )}
      </td>
      <td className="px-5 py-3">
        <ConnectionStatusBadge type="cms" />
      </td>
      <td className="px-5 py-3 text-scai-text-sec whitespace-nowrap text-xs">
        {formatDate(conn.createdAt)}
      </td>
      <td className="px-3 py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-lg hover:bg-scai-surface transition-colors text-scai-text-sec hover:text-scai-text">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {blogUrl && (
              <>
                <DropdownMenuItem asChild>
                  <a href={blogUrl.startsWith('http') ? blogUrl : `https://${blogUrl}`} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-2" />
                    Visit Site
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={onDisconnect} className="text-error focus:text-error">
              <Trash2 className="w-4 h-4 mr-2" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

// ─── Connection Forms ───────────────────────────────────────────────────────

function AddConnectionForm({ platform, onClose }: { platform: CMSPlatformConfig; onClose: () => void }) {
  const [name, setName] = useState(platform.name);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const createMutation = useCreateCMSConnection();
  const verifyMutation = useVerifyCMSCredentials();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const field of platform.fields) {
      if (field.required && !formData[field.name]) {
        toast.error(`${field.label} is required`);
        return;
      }
    }
    try {
      await createMutation.mutateAsync({ platform: platform.id, name, credentials: formData as unknown as CMSCredentials });
      toast.success(`Connected to ${platform.name}`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection failed");
    }
  };

  const handleVerify = async () => {
    try {
      const result = await verifyMutation.mutateAsync({ platform: platform.id, credentials: formData as unknown as CMSCredentials });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Connection Name" value={name} onChange={(e) => setName(e.target.value)} placeholder={`My ${platform.name} Account`} required />
      {platform.fields.map((field) => (
        <div key={field.name}>
          <Input
            label={field.label}
            type={field.type === "password" && !showPasswords[field.name] ? "password" : field.type === "url" ? "url" : "text"}
            value={formData[field.name] || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
            placeholder={field.placeholder}
            required={field.required}
            rightIcon={field.type === "password" ? (
              <button type="button" onClick={() => setShowPasswords((prev) => ({ ...prev, [field.name]: !prev[field.name] }))} className="text-scai-text-muted hover:text-scai-text">
                {showPasswords[field.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            ) : undefined}
          />
          {field.helpText && <p className="text-xs text-scai-text-muted mt-1">{field.helpText}</p>}
        </div>
      ))}
      <div className="flex items-center gap-2 pt-2 border-t border-scai-border">
        <a href={platform.helpUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-scai-brand1 hover:underline flex items-center gap-1">
          How to get credentials <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={handleVerify} disabled={verifyMutation.isPending} className="w-full">
          {verifyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Test
        </Button>
        <Button type="submit" variant="primary" disabled={createMutation.isPending} className="w-full">
          {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
          Connect
        </Button>
      </div>
    </form>
  );
}

function WordPressConnectionForm({ onClose }: { onClose: () => void }) {
  const [siteUrl, setSiteUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const connectMutation = useInitiateWordPressConnect();
  const { invalidateWordPress } = useInvalidateQueries();

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data?.type === "wordpress-connected") {
        setConnecting(false);
        invalidateWordPress();
        toast.success("WordPress site connected successfully!");
        onClose();
      } else if (event.data?.type === "wordpress-error") {
        setConnecting(false);
        toast.error("WordPress authorization failed. Please try again.");
      }
    },
    [invalidateWordPress, onClose]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteUrl.trim()) { toast.error("Please enter your WordPress site URL"); return; }

    let normalizedUrl = siteUrl.trim();
    if (!normalizedUrl.startsWith("http")) normalizedUrl = `https://${normalizedUrl}`;
    normalizedUrl = normalizedUrl.replace(/\/+$/, "");

    try {
      setConnecting(true);
      const authUrl = await connectMutation.mutateAsync(normalizedUrl);
      const w = 600, h = 700;
      const left = Math.round((screen.width - w) / 2);
      const top = Math.round((screen.height - h) / 2);
      const popup = window.open(authUrl, "wp-auth", `width=${w},height=${h},left=${left},top=${top},popup=yes,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no`);

      if (!popup) { toast.error("Popup blocked. Please allow popups for this site."); setConnecting(false); return; }

      const timer = setInterval(() => {
        if (popup.closed) { clearInterval(timer); setTimeout(() => setConnecting(false), 1000); }
      }, 500);
    } catch (err) {
      setConnecting(false);
      toast.error(err instanceof Error ? err.message : "Connection failed");
    }
  };

  return (
    <form onSubmit={handleConnect} className="space-y-4">
      <Input label="WordPress Site URL" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://your-site.com" />
      <p className="text-xs text-scai-text-muted">You&apos;ll be redirected to approve the connection in your WordPress admin panel.</p>
      <Button type="submit" variant="primary" disabled={connecting || !siteUrl.trim()} className="w-full">
        {connecting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Waiting for approval...</>
        ) : (
          <><WordPressIcon className="w-4 h-4 mr-2" />Connect WordPress</>
        )}
      </Button>
    </form>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function IntegrationsSettings() {
  const [platformPickerOpen, setPlatformPickerOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<UnifiedPlatform | null>(null);
  const [search, setSearch] = useState("");
  const [disconnectTarget, setDisconnectTarget] = useState<{
    id: string; name: string; platform: string; type: 'cms' | 'wordpress';
  } | null>(null);

  const { data: cmsConnections, isLoading: cmsLoading } = useCMSConnections();
  const { data: wpConnections, isLoading: wpLoading } = useWordPressConnections();
  const deleteCMSMutation = useDeleteCMSConnection();
  const deleteWPMutation = useDisconnectWordPress();

  const isLoading = cmsLoading || wpLoading;

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    try {
      if (disconnectTarget.type === 'wordpress') {
        await deleteWPMutation.mutateAsync(disconnectTarget.id);
      } else {
        await deleteCMSMutation.mutateAsync(disconnectTarget.id);
      }
      toast.success(`Disconnected from ${disconnectTarget.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Disconnect failed");
    } finally {
      setDisconnectTarget(null);
    }
  };

  // Connection counts for platform grid badges
  const connectionCounts: Record<string, number> = {};
  if (wpConnections) connectionCounts['wordpress'] = wpConnections.length;
  if (cmsConnections) {
    for (const conn of cmsConnections) {
      connectionCounts[conn.platform] = (connectionCounts[conn.platform] || 0) + 1;
    }
  }

  const totalConnections = (wpConnections?.length || 0) + (cmsConnections?.length || 0);
  const isWordPress = selectedPlatform?.id === 'wordpress';

  const filteredPlatforms = search.trim()
    ? ALL_PLATFORMS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : ALL_PLATFORMS;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-scai-brand1/20 to-scai-brand2/20">
          <Plug className="w-5 h-5 text-scai-brand1" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-scai-text">Integrations</h2>
          <p className="text-sm text-scai-text-muted">Connect your CMS platforms to publish articles directly</p>
        </div>
      </div>

      {/* Connected Accounts Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-scai-text-muted" />
        </div>
      ) : totalConnections > 0 ? (
        <div className="rounded-xl border border-scai-border bg-scai-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-scai-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <h3 className="text-sm font-medium text-scai-text">Connected ({totalConnections})</h3>
            </div>
            <Button variant="primary" size="sm" onClick={() => setPlatformPickerOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Add Platform
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-scai-border text-scai-text-sec">
                  <th className="text-left px-5 py-2.5 text-xs font-medium">Platform</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium">URL</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium">Status</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium">Added</th>
                  <th className="w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {wpConnections?.map((wpConn) => (
                  <WordPressTableRow
                    key={wpConn.id}
                    conn={wpConn}
                    onDisconnect={(id, name) => setDisconnectTarget({ id, name, platform: 'WordPress', type: 'wordpress' })}
                  />
                ))}
                {cmsConnections?.map((conn) => {
                  const config = CMS_PLATFORMS.find(p => p.id === conn.platform);
                  return (
                    <CMSTableRow
                      key={conn.id}
                      conn={conn}
                      config={config}
                      onDisconnect={() => setDisconnectTarget({ id: conn.id, name: conn.name, platform: config?.name || conn.platform, type: 'cms' })}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-scai-text-muted rounded-xl border border-scai-border bg-scai-card">
          <div className="p-3 rounded-full bg-scai-border mb-3">
            <Unplug className="w-5 h-5 text-scai-text-sec" />
          </div>
          <p className="text-sm">No connected platforms yet</p>
          <p className="text-xs text-scai-text-sec mt-1 mb-4">Connect a CMS platform to start publishing articles</p>
          <Button variant="primary" size="sm" onClick={() => setPlatformPickerOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Add Platform
          </Button>
        </div>
      )}

      {/* Add Platform Dialog — picker + form in one */}
      <Dialog open={platformPickerOpen} onOpenChange={(open) => {
        if (!open) { setPlatformPickerOpen(false); setSelectedPlatform(null); setSearch(""); }
      }}>
        <DialogContent className="max-w-md overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {!selectedPlatform ? (
              <motion.div
                key="picker"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <DialogHeader>
                  <DialogTitle>Add Platform</DialogTitle>
                  <DialogDescription>Choose a platform to connect</DialogDescription>
                </DialogHeader>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-scai-text-muted" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search platforms..."
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-scai-border bg-scai-input text-scai-text placeholder:text-scai-text-muted focus:outline-none focus:border-scai-brand1 focus:ring-2 focus:ring-scai-brand1/20"
                  />
                </div>
                <div className="mt-3" />
                {filteredPlatforms.length === 0 ? (
                  <p className="text-sm text-scai-text-muted text-center py-8">No platforms match &ldquo;{search}&rdquo;</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {filteredPlatforms.map((platform) => {
                      const count = connectionCounts[platform.id] || 0;
                      return (
                        <button
                          key={platform.id}
                          onClick={() => setSelectedPlatform(platform)}
                          className="flex flex-col items-start p-4 rounded-xl border transition-all text-left relative overflow-hidden group bg-scai-card border-scai-border hover:border-scai-brand1"
                        >
                          <div className="p-2 rounded-lg mb-3" style={{ backgroundColor: platform.bgColor }}>
                            {platform.id === 'wordpress' ? (
                              <WordPressIcon className="w-6 h-6" style={{ color: platform.color }} />
                            ) : (
                              <CMSPlatformIcon platform={platform.id as CMSPlatform} className="w-6 h-6" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-scai-text leading-none">{platform.name}</h3>
                            <p className="text-[10px] text-scai-text-muted leading-tight line-clamp-2">
                              {platform.description}
                            </p>
                          </div>
                          {count > 0 ? (
                            <div className="mt-3 flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-success" />
                              <span className="text-[10px] font-medium text-success">{count} connected</span>
                            </div>
                          ) : (
                            <div className="mt-3 flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-scai-text-muted" />
                              <span className="text-[10px] font-medium text-scai-text-sec">Not Connected</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPlatform(null)}
                      className="p-1.5 rounded-lg hover:bg-scai-surface transition-colors text-scai-text-sec hover:text-scai-text focus:outline-none"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: selectedPlatform.bgColor }}>
                      {isWordPress ? (
                        <WordPressIcon className="w-5 h-5" style={{ color: selectedPlatform.color }} />
                      ) : (
                        <CMSPlatformIcon platform={selectedPlatform.id as CMSPlatform} className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <DialogTitle>Connect {selectedPlatform.name}</DialogTitle>
                      <DialogDescription className="mt-0.5">{selectedPlatform.description}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                {isWordPress ? (
                  <WordPressConnectionForm onClose={() => { setPlatformPickerOpen(false); setSelectedPlatform(null); setSearch(""); }} />
                ) : (
                  <AddConnectionForm platform={selectedPlatform as CMSPlatformConfig} onClose={() => { setPlatformPickerOpen(false); setSelectedPlatform(null); setSearch(""); }} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unplug className="w-5 h-5 text-red-500" />
              Disconnect {disconnectTarget?.platform}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect{" "}
              <strong className="text-scai-text">{disconnectTarget?.name}</strong>?
              You can reconnect it later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDisconnectTarget(null)} disabled={deleteCMSMutation.isPending || deleteWPMutation.isPending} className="w-full">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisconnect} isLoading={deleteCMSMutation.isPending || deleteWPMutation.isPending} className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
