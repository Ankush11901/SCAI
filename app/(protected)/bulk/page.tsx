"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ARTICLE_TYPES } from "@/data/article-types";
import { toast } from "sonner";
import {
  BulkGeneratorForm,
  BulkProgressPanel,
  type GenerationMode,
  type TitleVariation,
  type CSVRow,
  type ArticleProgress,
  type BulkStats,
} from "@/components/bulk";
import { ClusterModeForm, type ClusterInput, type SavedBusiness } from "@/components/bulk/ClusterModeForm";
import type { LocalBusinessInfo, ArticleTypeContext } from "@/lib/services/content-generators";
import {
  useBulkGeneration,
  type BulkArticle,
} from "@/lib/hooks/useBulkGeneration";
import { useSession } from "@/lib/auth-client";
import { isWhitelabelUser } from "@/lib/utils/whitelabel";
import { AlertCircle, Cloud, X, Clock, Layers, Network, Grid3X3 } from "lucide-react";
import { type ImageProvider } from "@/components/generate/GeneratorForm";
import { DEFAULTS } from "@/lib/utils/user-preferences";
import { CreditExhaustedModal } from "@/components/billing";
import { SpotlightTour } from "@/components/onboarding/SpotlightTour";
import { TourTriggerButton } from "@/components/onboarding/TourTriggerButton";
import { BULK_TOUR_STEPS, BULK_TOUR_UPSELL_STEP } from "@/components/onboarding/tour-steps";
import { useOnboardingState } from "@/lib/hooks/useOnboardingState";
import { useSpotlightTour } from "@/lib/hooks/useSpotlightTour";

type PageMode = "bulk" | "cluster";

/**
 * Bulk Generation Page
 * Generate all 9 article types with a single keyword or upload CSV for batch.
 * Uses background generation via Trigger.dev - users can close the browser.
 */
export default function BulkGeneratePage() {
  const [pageMode, setPageMode] = useState<PageMode>("cluster");
  const [mode, setMode] = useState<GenerationMode>("single");
  const [keyword, setKeyword] = useState("");
  const [variations, setVariations] = useState<TitleVariation[]>([DEFAULTS.defaultTitleVariation]);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [isClusterStarting, setIsClusterStarting] = useState(false);
  const [imageProvider, setImageProvider] = useState<ImageProvider>("flux");
  const [designVariation, setDesignVariation] = useState(DEFAULTS.defaultDesignVariation);
  const [componentColor, setComponentColor] = useState(DEFAULTS.defaultComponentColor);
  const [isExportingQA, setIsExportingQA] = useState(false);

  // Local business info state (for cluster mode local articles)
  const [localBusinessInfo, setLocalBusinessInfo] = useState<LocalBusinessInfo>({});
  const [savedBusinesses, setSavedBusinesses] = useState<SavedBusiness[]>([]);

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallTier, setPaywallTier] = useState<"free" | "pro">("free");
  const [paywallResetsIn, setPaywallResetsIn] = useState<string | undefined>(undefined);
  const [paywallRenewsIn, setPaywallRenewsIn] = useState<string | undefined>(undefined);
  const [paywallCreditsRequired, setPaywallCreditsRequired] = useState<number | undefined>(undefined);
  const [paywallCreditsAvailable, setPaywallCreditsAvailable] = useState<number | undefined>(undefined);

  // Access control - allowed image providers based on user's plan
  const [allowedImageProviders, setAllowedImageProviders] = useState<ImageProvider[] | undefined>(undefined);

  // Fetch user plan to determine allowed providers
  useEffect(() => {
    async function fetchPlanAccess() {
      try {
        const response = await fetch("/api/billing/subscription");
        if (response.ok) {
          const data = await response.json();
          // Map specific model IDs from billing to general provider categories
          const rawProviders: string[] = data.plan?.allowedImageProviders || [];
          const mapped = new Set<ImageProvider>();
          for (const p of rawProviders) {
            if (p.startsWith("flux")) mapped.add("flux");
            else if (p.startsWith("gemini") || p.startsWith("imagen")) mapped.add("gemini");
          }
          setAllowedImageProviders(mapped.size > 0 ? Array.from(mapped) : ["flux"]);
        } else {
          setAllowedImageProviders(["flux"]);
        }
      } catch (error) {
        console.error("[BulkPage] Failed to fetch plan access:", error);
        setAllowedImageProviders(["flux"]);
      }
    }
    fetchPlanAccess();
  }, []);

  // Fetch user generation preferences from DB
  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.generationPreferences) return;
        const p = data.generationPreferences;
        if (p.defaultTitleVariation) setVariations([p.defaultTitleVariation]);
        if (p.defaultDesignVariation) setDesignVariation(p.defaultDesignVariation);
        if (p.defaultComponentColor) setComponentColor(p.defaultComponentColor);
      })
      .catch(() => {});
  }, []);

  // Fetch saved businesses for local article type
  const fetchSavedBusinesses = useCallback(async () => {
    try {
      const res = await fetch("/api/user/businesses");
      if (res.ok) {
        setSavedBusinesses(await res.json());
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchSavedBusinesses();
  }, [fetchSavedBusinesses]);

  // Session for admin check
  const { data: session } = useSession();
  const isAdmin = isWhitelabelUser(session?.user?.email);

  // Onboarding tour (for cluster mode)
  const onboarding = useOnboardingState();
  const bulkTourSteps = useMemo(() => {
    // For non-admin (likely free) users who can't access bulk, prepend upsell step
    if (!isAdmin) {
      return [BULK_TOUR_UPSELL_STEP, ...BULK_TOUR_STEPS.slice(1)];
    }
    return BULK_TOUR_STEPS;
  }, [isAdmin]);
  const tour = useSpotlightTour({
    steps: bulkTourSteps,
    tourId: "bulk",
    isCompleted: onboarding.bulkTourCompleted,
    isLoaded: onboarding.isLoaded,
    onComplete: () => onboarding.markCompleted("bulk"),
  });

  // Use the background generation hook
  const {
    state: bulkState,
    isRunning,
    hasQueue,
    startGeneration,
    retryFailed,
    cancelJob,
    clearJob,
    resumeJob,
    removeFromQueue,
  } = useBulkGeneration();

  // Track whether we're in the process of starting a generation
  const [isStarting, setIsStarting] = useState(false);

  // Timer for tracking generation elapsed time
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (bulkState.status === "running") {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    } else if (bulkState.status === "completed" || bulkState.status === "failed" || bulkState.status === "cancelled") {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    } else if (bulkState.status === "idle") {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      startTimeRef.current = null;
      setElapsedTime(0);
    }
  }, [bulkState.status]);

  // Persistent toast ID for background generation
  const PROGRESS_TOAST_ID = "bulk-generation-progress";

  // Show persistent toast when generation is running
  useEffect(() => {
    if (bulkState.status === "running" && bulkState.articles.length > 0) {
      const completed = bulkState.articles.filter((a) => a.status === "complete").length;
      const total = bulkState.articles.length;

      toast.loading(`Generating articles (${completed}/${total})`, {
        id: PROGRESS_TOAST_ID,
        description: "You can close this page and return later.",
        duration: Infinity,
      });
    } else if (bulkState.status === "completed") {
      toast.dismiss(PROGRESS_TOAST_ID);
      const completed = bulkState.articles.filter((a) => a.status === "complete").length;
      toast.success(`Generation complete!`, {
        description: `${completed} articles ready.`,
      });
    } else if (bulkState.status === "failed") {
      toast.dismiss(PROGRESS_TOAST_ID);
      toast.error("Generation failed", {
        description: bulkState.error || "An error occurred.",
      });
    } else if (bulkState.status === "cancelled") {
      toast.dismiss(PROGRESS_TOAST_ID);
      const completed = bulkState.articles.filter((a) => a.status === "complete").length;
      toast.info("Generation cancelled", {
        description: completed > 0 ? `${completed} articles completed before cancellation.` : "Job cancelled by user.",
      });
    } else if (bulkState.status === "idle") {
      toast.dismiss(PROGRESS_TOAST_ID);
    }
  }, [bulkState.status, bulkState.articles, bulkState.error]);

  // Map BulkArticle to ArticleProgress for the UI components
  const articles: ArticleProgress[] = useMemo(() => {
    return bulkState.articles.map((article: BulkArticle) => ({
      id: article.id,
      name: article.keyword,
      status: article.status,
      progress: article.progress,
      html: article.htmlContent,
      error: article.errorMessage,
      wordCount: article.wordCount,
      keyword: article.keyword,
      articleType: article.articleType,
      variation: (article as any).variation || variations[0],
      priority: article.priority ?? 0,
    }));
  }, [bulkState.articles, variations]);

  // Stats
  const stats: BulkStats = useMemo(() => {
    const completed = articles.filter((a) => a.status === "complete").length;
    const failed = articles.filter((a) => a.status === "error").length;
    const pending = articles.filter((a) => a.status === "pending").length;
    const generating = articles.filter(
      (a) => a.status === "generating"
    ).length;
    const total = articles.length;
    const avgProgress =
      total > 0
        ? Math.round(articles.reduce((sum, a) => sum + a.progress, 0) / total)
        : 0;
    return { completed, failed, pending, generating, total, avgProgress };
  }, [articles]);

  const canStart =
    (mode === "single" && keyword.trim().length > 0) ||
    (mode === "csv" && csvData.length > 0);

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());

      // Skip header row if it looks like a header
      const startIndex = lines[0]?.toLowerCase().includes("keyword") ? 1 : 0;

      const rows: CSVRow[] = [];
      for (let i = startIndex; i < lines.length; i++) {
        const [kw, articleType] = lines[i].split(",").map((s) => s.trim());
        if (kw && articleType) {
          // Validate article type
          const validType = ARTICLE_TYPES.find(
            (t) => t.id.toLowerCase() === articleType.toLowerCase()
          );
          if (validType) {
            rows.push({ keyword: kw, articleType: validType.id });
          }
        }
      }

      if (rows.length > 0) {
        setCsvData(rows);
        setMode("csv");
        toast.success(`Loaded ${rows.length} rows from CSV`);
      } else {
        toast.error("No valid rows found in CSV", {
          description:
            "Format: keyword,articleType (e.g., wireless headphones,affiliate)",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleCSVClear = () => {
    setCsvData([]);
    clearJob();
  };

  const handleStart = async () => {
    if (!canStart || isStarting) return;

    // Save current values before they get cleared
    const currentKeyword = keyword.trim();
    const currentCsvLength = csvData.length;

    setIsStarting(true);
    try {
      const result = await startGeneration({
        mode,
        keyword: mode === "single" ? currentKeyword : undefined,
        csvData: mode === "csv" ? csvData : undefined,
        variations,
        settings: {
          targetWordCount: 1000,
          variationName: designVariation,
          componentColor,
          provider: "openai",
          skipImages: false,
          imageProvider,
          // Exclude closing section by default
          excludeComponents: ['closing-h2', 'closing-paragraph'],
        },
      });

      // Clear the form after successfully adding to queue or starting
      if (mode === "single") {
        setKeyword("");
      }

      if (result.queued) {
        // Job was added to queue
        const articleCount = (mode === "csv" ? currentCsvLength : ARTICLE_TYPES.length) * variations.length;
        toast.success("Added to queue", {
          description: `${articleCount} articles queued at position #${result.position}`,
          icon: <Clock className="w-4 h-4" />,
        });
      } else if (mode === "csv") {
        toast.info("Background generation started", {
          description: `Generating ${currentCsvLength * variations.length} articles. You can close this page.`,
          icon: <Cloud className="w-4 h-4" />,
        });
      } else {
        const totalArticles = ARTICLE_TYPES.length * variations.length;
        toast.info("Background generation started", {
          description: `Generating ${totalArticles} article${totalArticles !== 1 ? "s" : ""} for "${currentKeyword}". You can close this page.`,
          icon: <Cloud className="w-4 h-4" />,
        });
      }
    } catch (error: any) {
      // Check for 402 (credit exhausted) from the hook
      if (error?.status === 402 && error?.details) {
        const { tier, resetsIn, renewsIn, creditsRequired, creditsAvailable } = error.details;
        setPaywallTier(tier || "free");
        setPaywallResetsIn(resetsIn || undefined);
        setPaywallRenewsIn(renewsIn || undefined);
        setPaywallCreditsRequired(creditsRequired ?? undefined);
        setPaywallCreditsAvailable(creditsAvailable ?? undefined);
        setShowPaywall(true);
      // Check for 403 (subscription required) from the hook
      } else if (error?.status === 403 && error?.details?.upgradeRequired) {
        setPaywallTier("free");
        setPaywallResetsIn(undefined);
        setPaywallRenewsIn(undefined);
        setShowPaywall(true);
      } else {
        toast.error("Failed to start generation", {
          description:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    try {
      await cancelJob();
      toast.info("Generation cancelled");
    } catch (error) {
      toast.error("Failed to cancel job");
    }
  };

  const retryArticle = async (articleId: string) => {
    if (isRunning) return;
    try {
      await retryFailed([articleId]);
      toast.info("Retrying article...");
    } catch (error) {
      toast.error("Failed to retry article");
    }
  };

  const retryAllFailed = async () => {
    if (isRunning) return;
    try {
      await retryFailed();
      toast.info("Retrying all failed articles...");
    } catch (error) {
      toast.error("Failed to retry articles");
    }
  };

  // Fetch article HTML for preview/download (it's stored in DB, not in hook state)
  const fetchArticleHtml = useCallback(async (articleId: string): Promise<string | null> => {
    if (!bulkState.jobId) return null;

    try {
      const response = await fetch(`/api/bulk/${bulkState.jobId}`);
      if (!response.ok) return null;

      const data = await response.json();
      const article = data.articles?.find((a: any) => a.id === articleId);
      return article?.htmlContent || null;
    } catch {
      return null;
    }
  }, [bulkState.jobId]);

  const handleDownloadSingle = async (article: ArticleProgress) => {
    let html: string | null | undefined = article.html;

    // If HTML not in state, fetch from API
    if (!html) {
      html = await fetchArticleHtml(article.id);
    }

    if (!html) {
      toast.error("Article content not available");
      return;
    }

    const articleKeyword = article.keyword || keyword;
    const articleType = mode === "csv" ? article.id.split("-")[0] : article.id.split("_article_")[0].split("_").pop() || article.id;

    const fullHtml = wrapInHtmlDocument(html, articleKeyword, articleType);
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${articleType}-${sanitizeFilename(articleKeyword)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    const completedArticles = articles.filter(
      (a) => a.status === "complete"
    );
    if (completedArticles.length === 0) return;

    for (const article of completedArticles) {
      await new Promise((r) => setTimeout(r, 300));
      await handleDownloadSingle(article);
    }

    toast.success("All articles downloaded", {
      description: `${completedArticles.length} HTML files saved`,
    });
  };

  // Handle QA Matrix export for all completed articles
  const handleGenerateQAExport = useCallback(async () => {
    if (!bulkState.jobId) {
      toast.error("No job ID found");
      return;
    }

    setIsExportingQA(true);
    try {
      const response = await fetch(`/api/bulk/${bulkState.jobId}/qa-export`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to export QA Matrix");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `qa-matrix-${bulkState.jobId}.html`;

      // Download the HTML file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("QA Matrix exported", {
        description: `${filename} downloaded`,
        icon: <Grid3X3 className="w-4 h-4" />,
      });
    } catch (error) {
      toast.error("Failed to export QA Matrix", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsExportingQA(false);
    }
  }, [bulkState.jobId]);

  // Handle paywall upgrade (free → pro)
  const handlePaywallUpgrade = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: 'monthly' }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      } else {
        const data = await res.json();
        if (res.status === 401) {
          toast.error('Authentication required', {
            description: 'Please sign in again to continue.',
          });
        } else if (res.status === 503) {
          toast.error('Payment system temporarily unavailable', {
            description: 'Please try again in a few moments.',
          });
        } else {
          toast.error('Unable to start subscription', {
            description: data.error || 'Failed to create subscription checkout',
          });
        }
      }
    } catch {
      toast.error('Unable to connect to payment system', {
        description: 'Please check your connection and try again.',
      });
    }
  }, []);

  // Handle paywall buy credits (pro users — PAYG)
  const handlePaywallBuyCredits = useCallback(async (packId: string) => {
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      } else {
        const data = await res.json();
        if (res.status === 401) {
          toast.error('Authentication required', {
            description: 'Please sign in again to continue.',
          });
        } else if (res.status === 503) {
          toast.error('Payment system temporarily unavailable', {
            description: 'Please try again in a few moments.',
          });
        } else {
          toast.error('Unable to purchase credits', {
            description: data.error || 'Failed to create credit checkout',
          });
        }
      }
    } catch {
      toast.error('Unable to connect to payment system', {
        description: 'Please check your connection and try again.',
      });
    }
  }, []);

  // Handle cluster mode generation
  const handleClusterStart = async (input: ClusterInput) => {
    if (isClusterStarting) return;

    setIsClusterStarting(true);
    try {
      const response = await fetch("/api/bulk/cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: input.topic,
          primaryKeyword: input.primaryKeyword,
          urlPattern: input.urlPattern,
          articleCount: input.articleCount,
          variation: input.variation,
          variations: input.variations,
          settings: {
            targetWordCount: 1000,
            variationName: designVariation,
            componentColor,
            provider: "openai",
            skipImages: false,
            imageProvider,
            allowedArticleTypes: input.allowedArticleTypes,
            aiChooseVariants: input.aiChooseVariants,
            // Exclude closing section by default
            excludeComponents: ['closing-h2', 'closing-paragraph'],
          },
          ...(Object.values(localBusinessInfo).some(v => v && String(v).trim())
            ? { localBusinessInfo, articleContext: { localBusinessInfo } as ArticleTypeContext }
            : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle 402 (credit exhausted) with paywall
        if (response.status === 402) {
          const { tier, resetsIn, renewsIn, creditsRequired, creditsAvailable } = data;
          setPaywallTier(tier || "free");
          setPaywallResetsIn(resetsIn || undefined);
          setPaywallRenewsIn(renewsIn || undefined);
          setPaywallCreditsRequired(creditsRequired ?? undefined);
          setPaywallCreditsAvailable(creditsAvailable ?? undefined);
          setShowPaywall(true);
          return;
        }
        // Handle 403 (subscription required) - show paywall with upgrade option
        if (response.status === 403 && data.upgradeRequired) {
          setPaywallTier("free");
          setPaywallResetsIn(undefined);
          setPaywallRenewsIn(undefined);
          setShowPaywall(true);
          return;
        }
        throw new Error(data.error || "Failed to start cluster generation");
      }

      // Refresh bulk state to show the new job
      if (data.jobId) {
        await resumeJob(data.jobId);
      }

      toast.success("Cluster generation started!", {
        description: `Creating ${input.articleCount} interlinked articles for "${input.topic}"`,
        icon: <Network className="w-4 h-4" />,
      });
    } catch (error) {
      toast.error("Failed to start cluster generation", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsClusterStarting(false);
    }
  };

  const clearResults = () => {
    clearJob();
    if (mode === "csv") {
      setCsvData([]);
      setMode("single");
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Error Banner */}
      {bulkState.error && (
        <div className="w-full bg-error/10 border-b border-error/20 px-4 py-3 shrink-0 mb-6">
          <div className="flex items-center gap-3 max-w-7xl mx-auto">
            <AlertCircle className="w-5 h-5 text-error" />
            <p className="text-sm text-error">{bulkState.error}</p>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-6 lg:flex-row min-h-0">
        {/* Left Panel - Form */}
        <div className="flex flex-col lg:w-[380px] flex-shrink-0 min-h-0 h-full">
          {/* Page Mode Toggle - only show for admin users */}
          {isAdmin && (
            <div className="flex bg-scai-surface rounded-xl p-1 mb-4 border border-scai-border">
              <button
                onClick={() => setPageMode("bulk")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  pageMode === "bulk"
                    ? "bg-scai-card shadow-sm text-scai-text"
                    : "text-scai-text-sec hover:text-scai-text"
                }`}
              >
                <Layers className="w-4 h-4" />
                Bulk Mode
              </button>
              <button
                onClick={() => setPageMode("cluster")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  pageMode === "cluster"
                    ? "bg-scai-card shadow-sm text-scai-text"
                    : "text-scai-text-sec hover:text-scai-text"
                }`}
              >
                <Network className="w-4 h-4" />
                Cluster Mode
              </button>
            </div>
          )}

          {/* Form based on page mode */}
          {pageMode === "bulk" ? (
            <BulkGeneratorForm
              mode={mode}
              keyword={keyword}
              variations={variations}
              csvData={csvData}
              isRunning={isRunning}
              isStarting={isStarting}
              hasRunningJob={isRunning && bulkState.jobId !== null}
              canStart={canStart}
              imageProvider={imageProvider}
              allowedImageProviders={allowedImageProviders}
              onModeChange={setMode}
              onKeywordChange={setKeyword}
              onVariationsChange={setVariations}
              onCSVUpload={handleCSVUpload}
              onCSVClear={handleCSVClear}
              onImageProviderChange={setImageProvider}
              onStart={handleStart}
              onStop={handleStop}
            />
          ) : (
            <ClusterModeForm
              isStarting={isClusterStarting}
              hasRunningJob={isRunning && bulkState.jobId !== null}
              imageProvider={imageProvider}
              allowedImageProviders={allowedImageProviders}
              onImageProviderChange={setImageProvider}
              onStart={handleClusterStart}
              localBusinessInfo={localBusinessInfo}
              onLocalBusinessInfoChange={setLocalBusinessInfo}
              savedBusinesses={savedBusinesses}
              onRefreshSavedBusinesses={fetchSavedBusinesses}
            />
          )}
        </div>

        {/* Right Panel - Queue & Progress */}
        <div className="flex flex-1 flex-col gap-4 min-h-0">
          {/* Queue Section */}
          {hasQueue && (
            <div className="flex-shrink-0 rounded-xl border border-scai-border bg-scai-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-scai-brand1" />
                  Queued Jobs
                </h3>
                <span className="text-xs text-scai-text-sec">
                  {bulkState.queuedJobs.length} waiting
                </span>
              </div>
              <div className="space-y-2">
                {bulkState.queuedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-scai-surface border border-scai-border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-scai-brand1">
                          #{job.queuePosition}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {job.keyword || `${job.totalArticles} articles`}
                        </span>
                      </div>
                      <p className="text-xs text-scai-text-sec mt-0.5">
                        {job.totalArticles} articles &middot; {job.variation}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromQueue(job.id)}
                      className="ml-2 p-1.5 rounded-md text-scai-text-muted hover:text-error hover:bg-error/10 transition-colors"
                      title="Remove from queue"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Panel */}
          <BulkProgressPanel
            articles={articles}
            stats={stats}
            isRunning={isRunning}
            elapsedTime={elapsedTime}
            showKeywords={mode === "csv"}
            showValidation={isAdmin}
            onSelectArticle={() => {}}
            onRetryArticle={retryArticle}
            onRetryAllFailed={retryAllFailed}
            onDownloadSingle={handleDownloadSingle}
            onDownloadAll={handleDownloadAll}
            onGenerateQAExport={handleGenerateQAExport}
            isExportingQA={isExportingQA}
            onClear={clearResults}
            onCancel={handleStop}
          />
        </div>
      </div>

      {/* Credit Exhausted Paywall Modal */}
      <CreditExhaustedModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        tier={paywallTier}
        resetsIn={paywallResetsIn}
        renewsIn={paywallRenewsIn}
        onUpgrade={handlePaywallUpgrade}
        onBuyCredits={handlePaywallBuyCredits}
        creditsRequired={paywallCreditsRequired}
        creditsAvailable={paywallCreditsAvailable}
      />

      {/* Onboarding Tour */}
      <SpotlightTour
        steps={tour.steps}
        isActive={tour.isActive}
        currentStep={tour.currentStep}
        onNext={tour.next}
        onBack={tour.back}
        onSkip={tour.skip}
      />
      <TourTriggerButton onClick={tour.restart} />
    </div>
  );
}

function wrapInHtmlDocument(
  content: string,
  title: string,
  articleType: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="SCAI Article Generator">
  <meta name="article-type" content="${articleType}">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Georgia', serif; line-height: 1.8; color: #111827; background: #fff; }
    .scai-article { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .scai-h1 { font-family: 'Inter', sans-serif; font-size: 2.5rem; font-weight: 900; color: #000; margin-bottom: 1.5rem; line-height: 1.1; }
    .scai-h2 { font-family: 'Inter', sans-serif; font-size: 1.75rem; font-weight: 800; color: #000; margin-top: 2.5rem; margin-bottom: 1.25rem; }
    .scai-paragraph { font-size: 1.1rem; color: #374151; margin-bottom: 1.5rem; }
    .scai-featured-image { margin: 2rem 0; }
    .scai-featured-image img { width: 100%; height: auto; border-radius: 4px; }
    .scai-toc { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; margin: 2rem 0; }
    .scai-toc-title { font-weight: 700; margin-bottom: 1rem; }
    .scai-toc-list { list-style: decimal; padding-left: 1.5rem; }
    .scai-toc-list li { margin-bottom: 0.5rem; }
    .scai-toc-list a { color: #2563eb; text-decoration: none; }
    .scai-faq { margin: 2.5rem 0; }
    .scai-faq-title { font-size: 1.5rem; font-weight: 800; margin-bottom: 1.5rem; }
    .scai-faq-item { margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #e5e7eb; }
    .scai-faq-question { font-weight: 600; margin-bottom: 0.5rem; }
    .scai-faq-answer { color: #374151; }
    .scai-closing { margin-top: 3rem; padding-top: 2rem; border-top: 2px solid #e5e7eb; }
  </style>
</head>
<body>
  <article class="scai-article" data-article-type="${articleType}">
    ${content}
  </article>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (c) => entities[c]);
}

function sanitizeFilename(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 50);
}
