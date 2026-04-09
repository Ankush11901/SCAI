"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getComponentsForArticleType } from "@/data/components";
import type {
  TitleVariation,
  UsedVariation,
  ValidationIssue,
  ValidationSummary,
} from "@/lib/types/generation";
import {
  GeneratorForm,
  ArticlePreview,
  type ArticlePreviewRef,
  type BaseVariationName,
  type AIProvider,
  type ImageProvider,
} from "@/components/generate";

import type { ArticleTypeContext } from "@/lib/services/content-generators";
import { useSession } from "@/lib/auth-client";
import { isWhitelabelUser } from "@/lib/utils/whitelabel";
import { getWordCountTargetForType, DEFAULTS, type UserPreferences } from "@/lib/utils/user-preferences";
import { generateFingerprint } from "@/lib/utils/fingerprint";
import { CreditExhaustedModal } from "@/components/billing";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRealtimeGeneration } from "@/lib/hooks/useRealtimeGeneration";
import { SpotlightTour } from "@/components/onboarding/SpotlightTour";
import { TourTriggerButton } from "@/components/onboarding/TourTriggerButton";
import { GENERATE_TOUR_STEPS } from "@/components/onboarding/tour-steps";
import { useOnboardingState } from "@/lib/hooks/useOnboardingState";
import { useSpotlightTour } from "@/lib/hooks/useSpotlightTour";

interface ValidationResult {
  isValid: boolean;
  score: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: ValidationSummary;
}

interface GenerationState {
  status: "idle" | "generating" | "complete" | "error";
  phase:
    | "content"
    | "images"
    | "validation"
    | "correction"
    | "finalizing"
    | "done";
  progress: number;
  html: string;
  rawContent: string;
  displayedHtml: string;
  wordCount: number;
  statusMessage: string;
  usedVariations?: UsedVariation[];
  usedVariation?: string;
  usedProvider?: string;
  validation?: ValidationResult;
  currentImage?: {
    heading: string;
    index: number;
    total: number;
    description?: string;
  };
  imageProgress?: {
    completed: number;
    total: number;
  };
  historyId?: string;
  error?: string;
  elapsedTime?: number; // Elapsed time in seconds
}

const initialState: GenerationState = {
  status: "idle",
  phase: "content",
  progress: 0,
  html: "",
  rawContent: "",
  displayedHtml: "",
  wordCount: 0,
  statusMessage: "",
  historyId: undefined,
};

/**
 * Replace placeholder image URLs with either completed R2 images or loading spinners.
 * During image phase: completed images show real URLs, pending ones show spinners.
 * On completion: output.html has all real URLs — this function is not needed.
 */
function replaceImagesWithSpinnersOrReal(
  html: string,
  completedImageUrls?: Map<string, string>,
): string {
  const placeholderRegex =
    /(<img\s+[^>]*?)src=["'](https:\/\/(via\.placeholder\.com|placehold\.co)[^"']+)["']([^>]*>)/gi;

  return html.replace(
    placeholderRegex,
    (match, beforeSrc, placeholderUrl, _domain, afterSrc) => {
      // Check if this image has a completed R2 URL via data-image-id
      if (completedImageUrls && completedImageUrls.size > 0) {
        // Try to find imageId from data-image-id attribute in the match
        const imageIdMatch = match.match(/data-image-id=["']([^"']+)["']/);
        if (imageIdMatch) {
          const realUrl = completedImageUrls.get(imageIdMatch[1]);
          if (realUrl) {
            return `${beforeSrc}src="${realUrl}"${afterSrc}`;
          }
        }
        // Fallback: try matching by placeholder URL index pattern (Loading+Image+N)
        const indexMatch = placeholderUrl.match(/Loading[+%20]Image[+%20](\d+)/);
        if (indexMatch) {
          for (const [imageId, realUrl] of completedImageUrls) {
            const idIndexMatch = imageId.match(/^img_\d+_(\d+)_/);
            if (idIndexMatch && idIndexMatch[1] === indexMatch[1]) {
              return `${beforeSrc}src="${realUrl}"${afterSrc}`;
            }
          }
        }
      }

      // No completed URL — show spinner
      return `<div class="scai-image-loading-wrapper" data-placeholder="${placeholderUrl}" style="width:100%;max-height:400px;height:300px;display:flex;align-items:center;justify-content:center;background:#f9fafb;border:2px dashed #40EDC3;border-radius:20px;margin:1.5rem 0;"><div style="display:flex;flex-direction:column;align-items:center;gap:12px;"><div style="width:40px;height:40px;border:3px solid #e5e7eb;border-top-color:#40EDC3;border-radius:50%;animation:spin 1s linear infinite;"></div><span style="color:#6b7280;font-size:14px;">Generating image...</span></div></div>`;
    },
  );
}

/**
 * Split structured HTML into top-level block elements for progressive reveal.
 */
function splitHtmlBlocks(html: string): string[] {
  const blockTagRegex = /(?=<(?:h[1-6]|p|div|section|article|figure|table|ul|ol|blockquote|header|footer|nav|aside|hr|pre)[\s>])/gi;
  const blocks = html.split(blockTagRegex).filter(Boolean);
  return blocks;
}

/**
 * Article Generator Page
 * Clean interface for real-time article generation with live preview
 */
export default function GeneratePage() {
  const queryClient = useQueryClient();
  // Session for whitelabel check
  const { data: session } = useSession();
  const showValidation = isWhitelabelUser(session?.user?.email);

  // Onboarding tour
  const onboarding = useOnboardingState();
  const tour = useSpotlightTour({
    steps: GENERATE_TOUR_STEPS,
    tourId: "generate",
    isCompleted: onboarding.generateTourCompleted,
    isLoaded: onboarding.isLoaded,
    onComplete: () => onboarding.markCompleted("generate"),
  });

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
        console.error("[GeneratePage] Failed to fetch plan access:", error);
        setAllowedImageProviders(["flux"]);
      }
    }
    fetchPlanAccess();
  }, []);

  // Fetch user credit balance
  useEffect(() => {
    async function fetchCreditBalance() {
      try {
        const response = await fetch("/api/credits");
        if (response.ok) {
          const data = await response.json();
          setUserCreditBalance(data.credits?.available || 0);
          setIsUnlimited(data.credits?.isUnlimited === true);
          setUserTier(data.credits?.tier === "pro" ? "pro" : "free");
          setMonthlyResetsAt(data.credits?.monthly?.resetsAt);
        }
      } catch (error) {
        console.error("[GeneratePage] Failed to fetch credit balance:", error);
      }
    }
    fetchCreditBalance();
  }, []);

  // Form state - initialized from SSR-safe defaults
  const [topic, setTopic] = useState("");
  const [articleType, setArticleType] = useState(DEFAULTS.defaultArticleType);
  const [variation, setVariation] = useState<TitleVariation>(DEFAULTS.defaultTitleVariation);
  const [componentColor, setComponentColor] = useState(DEFAULTS.defaultComponentColor);
  const [targetWordCount, setTargetWordCount] = useState(getWordCountTargetForType(DEFAULTS, DEFAULTS.defaultArticleType));

  // User component preferences (used by enabledComponents default effect)
  const userPrefsRef = useRef<UserPreferences>(DEFAULTS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Fetch user generation preferences from DB
  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.generationPreferences) return;
        const p = data.generationPreferences;
        if (p.defaultArticleType) setArticleType(p.defaultArticleType);
        if (p.defaultTitleVariation) setVariation(p.defaultTitleVariation);
        if (p.defaultArticleType || p.defaultWordCount) {
          const prefs = { ...DEFAULTS, ...p };
          setTargetWordCount(getWordCountTargetForType(prefs, prefs.defaultArticleType));
        }
        if (p.defaultDesignVariation) setVariationName(p.defaultDesignVariation);
        if (p.defaultComponentColor) setComponentColor(p.defaultComponentColor);
        userPrefsRef.current = { ...DEFAULTS, ...p };
      })
      .catch(() => {/* non-critical */})
      .finally(() => setPrefsLoaded(true));
  }, []);
  const [variationName, setVariationName] = useState<
    BaseVariationName | "random"
  >(DEFAULTS.defaultDesignVariation);
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [enabledComponents, setEnabledComponents] = useState<Set<string>>(
    new Set(),
  );
  const [enableKeywordExpansion, setEnableKeywordExpansion] = useState(true);
  const [enableAutoCorrection, setEnableAutoCorrection] = useState(true);
  const [skipImages, setSkipImages] = useState(false);
  const [imageProvider, setImageProvider] = useState<ImageProvider>("flux");
  const [articleContext, setArticleContext] = useState<ArticleTypeContext>({});
  const [savedBusinesses, setSavedBusinesses] = useState<{ id: string; label: string; businessName?: string | null; phone?: string | null; hours?: string | null; city?: string | null; stateRegion?: string | null; postalCode?: string | null; servicesOffered?: string | null; email?: string | null; website?: string | null; gbpUrl?: string | null }[]>([]);
  const [savedCommercialProfiles, setSavedCommercialProfiles] = useState<{ id: string; label: string; productName?: string | null; category?: string | null; targetAudience?: string | null; painPoint?: string | null; keyBenefits?: string | null; keyFeatures?: string | null; uniqueValue?: string | null; ctaSuggestion?: string | null; pricePosition?: string | null }[]>([]);

  // Handle article type change — adjust word count to per-type minimum if below it
  const handleArticleTypeChange = useCallback((newType: string) => {
    setArticleType(newType);
    const typeDefault = getWordCountTargetForType(DEFAULTS, newType);
    setTargetWordCount((prev) => Math.max(prev, typeDefault));
  }, []);

  // Credit estimation state
  const [estimatedCredits, setEstimatedCredits] = useState<number | undefined>(undefined);
  const [userCreditBalance, setUserCreditBalance] = useState<number | undefined>(undefined);
  const [isCalculatingCredits, setIsCalculatingCredits] = useState(false);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [userTier, setUserTier] = useState<"free" | "pro">("free");
  const [monthlyResetsAt, setMonthlyResetsAt] = useState<string | undefined>(undefined);

  // Fetch saved profiles for article type context sheets
  const fetchSavedBusinesses = useCallback(async () => {
    try {
      const res = await fetch("/api/user/businesses")
      if (res.ok) {
        setSavedBusinesses(await res.json())
      }
    } catch { /* silent */ }
  }, [])

  const fetchSavedCommercialProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/user/commercial-profiles")
      if (res.ok) {
        setSavedCommercialProfiles(await res.json())
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchSavedBusinesses()
    fetchSavedCommercialProfiles()
  }, [fetchSavedBusinesses, fetchSavedCommercialProfiles])

  // Estimate credits when relevant parameters change
  useEffect(() => {
    // Debounce the credit estimation
    const timeoutId = setTimeout(async () => {
      if (!articleType || !targetWordCount) return;

      setIsCalculatingCredits(true);
      try {
        // Calculate selectedComponents: required components + enabled optional components
        const availableComponents = getComponentsForArticleType(articleType);
        const requiredIds = availableComponents.filter((c) => c.required).map((c) => c.id);
        const selectedComponents = [...requiredIds, ...Array.from(enabledComponents)];

        const response = await fetch("/api/credits/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wordCount: targetWordCount,
            articleType,
            imageProvider: skipImages ? "none" : imageProvider,
            selectedComponents, // Pass enabled components for accurate credit calculation
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setEstimatedCredits(data.credits);
        }
      } catch (error) {
        console.error("[GeneratePage] Failed to estimate credits:", error);
      } finally {
        setIsCalculatingCredits(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [articleType, targetWordCount, imageProvider, skipImages, enabledComponents]);

  // Paywall modal state
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallTier, setPaywallTier] = useState<"free" | "pro">("free");
  const [paywallResetsIn, setPaywallResetsIn] = useState<string | undefined>();
  const [paywallRenewsIn, setPaywallRenewsIn] = useState<string | undefined>();

  // Debug: Show paywall via keyboard shortcut (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Calculate reset time from actual user data
      let resetsIn: string | undefined;
      if (monthlyResetsAt) {
        const now = new Date();
        const resetDate = new Date(monthlyResetsAt);
        const diffMs = resetDate.getTime() - now.getTime();
        if (diffMs > 0) {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          resetsIn = days > 0 ? `${days} days` : `${hours} hours`;
        } else {
          resetsIn = "soon";
        }
      } else {
        resetsIn = "~28 days"; // Fallback if not loaded yet
      }

      // Ctrl+Shift+P - Show paywall for Pro tier
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setPaywallTier("pro");
        setPaywallResetsIn(undefined);
        setPaywallRenewsIn(resetsIn);
        setShowPaywall(true);
      }
      // Ctrl+Shift+F - Show paywall for Free tier
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setPaywallTier("free");
        setPaywallResetsIn(resetsIn);
        setPaywallRenewsIn(undefined);
        setShowPaywall(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [monthlyResetsAt]);

  // Generation state
  const [state, setState] = useState<GenerationState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previewRef = useRef<ArticlePreviewRef>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fingerprintRef = useRef<string | null>(null);

  // Realtime (Trigger.dev) state
  const searchParams = useSearchParams();
  const [runId, setRunId] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const realtimeState = useRealtimeGeneration(runId, publicToken);
  const realtimeCompleteHandledRef = useRef(false);

  // Simulated article reveal state (block-by-block)
  const [revealTrigger, setRevealTrigger] = useState(0); // increment to start reveal
  const structuredHtmlRef = useRef<string>("");
  const revealBlocksRef = useRef<string[]>([]);
  const revealIndexRef = useRef<number>(0);
  const revealIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate browser fingerprint on mount (for anonymous usage tracking)
  useEffect(() => {
    generateFingerprint().then((fp) => {
      fingerprintRef.current = fp;
    }).catch((error) => {
      console.error("[GeneratePage] Failed to generate fingerprint:", error);
    });
  }, []);

  // ─── Reconnection: check URL, sessionStorage, or DB for active run on mount ──
  useEffect(() => {
    const urlRunId = searchParams.get("runId");
    let storedRun: { runId: string; historyId?: string; formState?: any } | null = null;
    try {
      const raw = sessionStorage.getItem("scai-active-run");
      if (raw) storedRun = JSON.parse(raw);
    } catch { /* ignore */ }

    // INSTANT RESTORATION from sessionStorage (0ms - no flash of empty fields)
    if (storedRun?.formState) {
      const fs = storedRun.formState;
      setTopic(fs.topic || "");
      setArticleType(fs.articleType || DEFAULTS.defaultArticleType);
      if (fs.variation) setVariation(fs.variation);
      if (fs.variationName) setVariationName(fs.variationName);
      if (fs.provider) setProvider(fs.provider);
      if (fs.targetWordCount) setTargetWordCount(fs.targetWordCount);
      if (fs.componentColor) setComponentColor(fs.componentColor);
      if (fs.skipImages !== undefined) setSkipImages(fs.skipImages);
      if (fs.imageProvider) setImageProvider(fs.imageProvider);
      if (fs.enableKeywordExpansion !== undefined) setEnableKeywordExpansion(fs.enableKeywordExpansion);
      if (fs.enableAutoCorrection !== undefined) setEnableAutoCorrection(fs.enableAutoCorrection);
      if (fs.enabledComponents) setEnabledComponents(new Set(fs.enabledComponents));
    }

    const activeRunId = urlRunId || storedRun?.runId;
    const storedHistoryId = storedRun?.historyId;

    // If we already have a runId set, don't reconnect
    if (runId) return;

    // Helper function to reconnect to an active run
    const reconnectToRun = async (targetRunId: string, targetHistoryId?: string, hasFormState?: boolean) => {
      setState((prev) => ({
        ...prev,
        status: "generating",
        phase: "content",
        statusMessage: "Reconnecting to generation...",
        historyId: targetHistoryId || prev.historyId,
      }));
      startTimeRef.current = Date.now();

      try {
        const res = await fetch(`/api/generate/realtime-token?runId=${encodeURIComponent(targetRunId)}`);
        const data = res.ok ? await res.json() : null;

        if (data?.publicToken) {
          // Run still accessible — connect realtime
          setRunId(data.runId);
          setPublicToken(data.publicToken);
          
          // DB Fallback: Restore form state from database if sessionStorage was cleared
          if (data.historyId && !hasFormState) {
            try {
              const historyRes = await fetch(`/api/generate/history-status?historyId=${encodeURIComponent(data.historyId)}`);
              if (historyRes.ok) {
                const dbData = await historyRes.json();
                setTopic(dbData.keyword || "");
                setArticleType(dbData.articleType || DEFAULTS.defaultArticleType);
              }
            } catch { /* ignore - proceed with default values */ }
          }
          
          setState((prev) => ({
            ...prev,
            historyId: data.historyId || prev.historyId,
          }));
          return true;
        } else if (targetHistoryId) {
          // Realtime token failed — try DB recovery for completed generation
          const historyRes = await fetch(`/api/generate/history-status?historyId=${encodeURIComponent(targetHistoryId)}`);
          if (historyRes.ok) {
            const dbData = await historyRes.json();
            if (dbData.htmlContent) {
              const meta = dbData.metadata || {};
              
              if (!hasFormState) {
                setTopic(dbData.keyword || "");
                setArticleType(dbData.articleType || DEFAULTS.defaultArticleType);
              }
              
              setState((prev) => ({
                ...prev,
                status: "complete",
                phase: "done",
                progress: 100,
                html: dbData.htmlContent,
                displayedHtml: dbData.htmlContent,
                wordCount: dbData.wordCount || prev.wordCount,
                historyId: targetHistoryId,
                usedVariation: meta.usedVariation || prev.usedVariation,
                usedProvider: meta.usedProvider || prev.usedProvider,
                statusMessage: `Complete! ${dbData.wordCount || 0} words`,
              }));
              try { sessionStorage.removeItem("scai-active-run"); } catch { /* ignore */ }
              return true;
            }
          }
        }
        return false;
      } catch {
        return false;
      }
    };

    // If we have a runId from URL or sessionStorage, try to reconnect
    if (activeRunId) {
      reconnectToRun(activeRunId, storedHistoryId, !!storedRun?.formState).then((success) => {
        if (!success) {
          try { sessionStorage.removeItem("scai-active-run"); } catch { /* ignore */ }
          setState(initialState);
        }
      });
      return;
    }

    // No runId in URL or sessionStorage — check DB for any active user generations
    // This handles the case where browser was closed and sessionStorage was cleared
    fetch('/api/generate/active-run')
      .then((res) => res.ok ? res.json() : null)
      .then(async (data) => {
        if (data?.active && data.runId) {
          // Found an active generation — restore form state and reconnect
          if (data.keyword) setTopic(data.keyword);
          if (data.articleType) setArticleType(data.articleType);
          
          // Restore full form state if available
          if (data.formState) {
            const fs = data.formState;
            if (fs.variation) setVariation(fs.variation);
            if (fs.variationName) setVariationName(fs.variationName);
            if (fs.provider) setProvider(fs.provider);
            if (fs.targetWordCount) setTargetWordCount(fs.targetWordCount);
            if (fs.componentColor) setComponentColor(fs.componentColor);
            if (fs.skipImages !== undefined) setSkipImages(fs.skipImages);
            if (fs.imageProvider) setImageProvider(fs.imageProvider);
            if (fs.enableKeywordExpansion !== undefined) setEnableKeywordExpansion(fs.enableKeywordExpansion);
            if (fs.enableAutoCorrection !== undefined) setEnableAutoCorrection(fs.enableAutoCorrection);
            if (fs.enabledComponents) setEnabledComponents(new Set(fs.enabledComponents));
          }

          // Connect directly with the provided token
          setRunId(data.runId);
          setPublicToken(data.publicToken);
          setState((prev) => ({
            ...prev,
            status: "generating",
            phase: "content",
            statusMessage: "Reconnecting to generation...",
            historyId: data.historyId || prev.historyId,
          }));
          startTimeRef.current = Date.now();

          // Store in sessionStorage for faster reconnect next time
          try {
            sessionStorage.setItem("scai-active-run", JSON.stringify({
              runId: data.runId,
              historyId: data.historyId,
              formState: data.formState || {
                topic: data.keyword,
                articleType: data.articleType,
              }
            }));
          } catch { /* ignore */ }

          // Update URL
          const url = new URL(window.location.href);
          url.searchParams.set("runId", data.runId);
          window.history.replaceState({}, "", url.toString());
        }
      })
      .catch(() => { /* No active run, stay on idle state */ });
  }, []); // Only on mount

  // ─── Sync realtime state → GenerationState ─────────────────────────────
  useEffect(() => {
    if (!runId) return;

    // Update generation state from realtime hook during streaming
    setState((prev) => {
      if (prev.status !== "generating") return prev;

      const phase = realtimeState.phase === "images" ? "images" : prev.phase;
      const imageProgress = realtimeState.imageProgress || prev.imageProgress;

      // During image phase: prefer processedHtml (post-processed, properly structured)
      // During content phase: use raw stream HTML
      const sourceHtml = (phase === "images" && realtimeState.processedHtml)
        ? realtimeState.processedHtml
        : realtimeState.html;

      // Calculate progress based on phase
      let progress = prev.progress;
      if (phase === "images" && imageProgress?.total) {
        progress = 35 + (imageProgress.completed / imageProgress.total) * 55;
      } else if (realtimeState.wordCount) {
        progress = Math.min(30, 5 + (realtimeState.wordCount / 1000) * 25);
      }

      // During content phase: accumulate html but keep displayedHtml empty
      // so the warmup animation stays visible (raw stream looks unstructured)
      if (phase !== "images") {
        return {
          ...prev,
          html: sourceHtml || prev.html,
          rawContent: sourceHtml || prev.rawContent,
          // displayedHtml stays empty → warmup animation continues
          wordCount: realtimeState.wordCount || prev.wordCount,
          statusMessage: realtimeState.statusMessage || prev.statusMessage,
          usedVariation: realtimeState.usedVariation || prev.usedVariation,
          usedProvider: realtimeState.usedProvider || prev.usedProvider,
          phase,
          imageProgress,
          progress,
        };
      }

      // Phase is "images" — start simulated block reveal if not already running
      if (realtimeState.processedHtml && !revealIntervalRef.current && !prev.displayedHtml) {
        structuredHtmlRef.current = realtimeState.processedHtml;
        revealBlocksRef.current = splitHtmlBlocks(realtimeState.processedHtml);
        revealIndexRef.current = 0;
        // Trigger the reveal effect via state update (refs don't trigger re-renders)
        setTimeout(() => setRevealTrigger((n) => n + 1), 0);
      }

      // During reveal or after reveal: update images on already-displayed content
      const completedUrls = realtimeState.completedImageUrls;
      const displayedHtml = prev.displayedHtml
        ? replaceImagesWithSpinnersOrReal(prev.displayedHtml, completedUrls.size > 0 ? completedUrls : undefined)
        : prev.displayedHtml;

      return {
        ...prev,
        html: sourceHtml || prev.html,
        rawContent: sourceHtml || prev.rawContent,
        displayedHtml,
        wordCount: realtimeState.wordCount || prev.wordCount,
        statusMessage: realtimeState.statusMessage || prev.statusMessage,
        usedVariation: realtimeState.usedVariation || prev.usedVariation,
        usedProvider: realtimeState.usedProvider || prev.usedProvider,
        phase,
        imageProgress,
        progress,
      };
    });

    // Handle task completion — output.html has real R2 URLs (images already processed)
    if (realtimeState.isComplete && realtimeState.output && !realtimeCompleteHandledRef.current) {
      realtimeCompleteHandledRef.current = true;
      const output = realtimeState.output;
      const imageStats = output.imageStats;

      // Stop reveal if still running
      if (revealIntervalRef.current) {
        clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        status: "complete",
        phase: "done",
        progress: 100,
        html: output.html,
        displayedHtml: output.html,
        wordCount: output.wordCount,
        usedVariation: output.usedVariation || prev.usedVariation,
        usedProvider: output.usedProvider || prev.usedProvider,
        historyId: output.historyId || prev.historyId,
        statusMessage: `Complete! ${output.wordCount} words${imageStats ? `, ${imageStats.successful} images` : ""}`,
      }));

      // Clean up
      const url = new URL(window.location.href);
      url.searchParams.delete("runId");
      window.history.replaceState({}, "", url.toString());
      try { sessionStorage.removeItem("scai-active-run"); } catch { /* ignore */ }
      queryClient.invalidateQueries({ queryKey: ["quota"] });
    }

    // Handle failure
    if (realtimeState.isFailed && !realtimeCompleteHandledRef.current) {
      realtimeCompleteHandledRef.current = true;
      if (revealIntervalRef.current) {
        clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
      }
      setState((prev) => ({
        ...prev,
        status: "error",
        error: realtimeState.error || "Generation failed",
      }));
      try { sessionStorage.removeItem("scai-active-run"); } catch { /* ignore */ }
    }
  }, [
    runId,
    realtimeState.html,
    realtimeState.wordCount,
    realtimeState.statusMessage,
    realtimeState.isComplete,
    realtimeState.isFailed,
    realtimeState.output,
    realtimeState.phase,
    realtimeState.imageProgress,
    realtimeState.processedHtml,
    realtimeState.completedImageUrls.size,
  ]);

  // ─── Simulated article block-by-block reveal effect ─────────────────────
  useEffect(() => {
    if (revealTrigger === 0 || revealIntervalRef.current) return;

    const blocks = revealBlocksRef.current;
    if (!blocks.length) return;

    revealIntervalRef.current = setInterval(() => {
      revealIndexRef.current = Math.min(revealIndexRef.current + 1, blocks.length);

      const partialHtml = blocks.slice(0, revealIndexRef.current).join("");
      const completedUrls = realtimeState.completedImageUrls;
      const displayedHtml = replaceImagesWithSpinnersOrReal(
        partialHtml,
        completedUrls.size > 0 ? completedUrls : undefined,
      );

      setState((prev) => ({
        ...prev,
        displayedHtml,
      }));

      // All blocks revealed — stop
      if (revealIndexRef.current >= blocks.length) {
        clearInterval(revealIntervalRef.current!);
        revealIntervalRef.current = null;
      }
    }, 150);

    return () => {
      if (revealIntervalRef.current) {
        clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
      }
    };
  }, [revealTrigger]);

  // Timer effect - tracks elapsed time during generation
  useEffect(() => {
    if (state.status === "generating") {
      // Start the timer if not already started
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      // Update elapsed time every second
      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setState((prev) => ({ ...prev, elapsedTime: elapsed }));
        }
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    } else if (state.status === "complete" || state.status === "idle") {
      // Stop the timer but keep the final elapsed time
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      // Reset start time for next generation (but only when idle)
      if (state.status === "idle") {
        startTimeRef.current = null;
      }
    }
  }, [state.status]);

  // Get components for current article type
  const availableComponents = useMemo(() => {
    return getComponentsForArticleType(articleType);
  }, [articleType]);

  const optionalComponents = useMemo(() => {
    return availableComponents.filter((c) => !c.required);
  }, [availableComponents]);

  const requiredComponents = useMemo(() => {
    return availableComponents.filter((c) => c.required);
  }, [availableComponents]);

  // Map settings keys to component IDs that should be toggled off when the pref is false
  const PREF_TO_COMPONENTS: Record<string, string[]> = {
    autoIncludeH2Images: ['h2-image', 'h2-image-alt'],
    autoIncludeMetaTitle: ['meta-title'],
    autoIncludeMetaDescription: ['meta-description'],
    autoIncludeClosingSection: ['closing-h2', 'closing-paragraph'],
  };

  // Default optional components based on user preferences from settings page
  useEffect(() => {
    if (!prefsLoaded) return;
    const prefs = userPrefsRef.current;
    const disabledIds = new Set<string>();
    for (const [prefKey, componentIds] of Object.entries(PREF_TO_COMPONENTS)) {
      if (!(prefs as unknown as Record<string, unknown>)[prefKey]) {
        componentIds.forEach((id) => disabledIds.add(id));
      }
    }
    setEnabledComponents(new Set(
      optionalComponents
        .filter((c) => !disabledIds.has(c.id))
        .map((c) => c.id)
    ));
  }, [optionalComponents, prefsLoaded]);

  // Toggle optional component
  const toggleComponent = useCallback((id: string) => {
    setEnabledComponents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!topic.trim() || state.status === "generating") return;

    // ─── Pre-generation credit check (show paywall immediately if insufficient) ───
    if (
      !isUnlimited &&
      estimatedCredits !== undefined &&
      userCreditBalance !== undefined &&
      estimatedCredits > userCreditBalance
    ) {
      // Calculate time until reset for paywall
      let resetsIn: string | undefined;
      if (monthlyResetsAt) {
        const now = new Date();
        const resetDate = new Date(monthlyResetsAt);
        const diffMs = resetDate.getTime() - now.getTime();
        if (diffMs > 0) {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          resetsIn = days > 0 ? `${days} days` : `${hours} hours`;
        } else {
          resetsIn = "soon";
        }
      } else {
        // Fallback: monthly credits typically reset in ~28-30 days
        resetsIn = "~28 days";
      }
      
      setPaywallTier(userTier);
      if (userTier === "pro") {
        setPaywallResetsIn(undefined);
        setPaywallRenewsIn(resetsIn);
      } else {
        setPaywallResetsIn(resetsIn);
        setPaywallRenewsIn(undefined);
      }
      setShowPaywall(true);
      return;
    }

    abortControllerRef.current = new AbortController();

    // Reset the timer for new generation
    startTimeRef.current = Date.now();

    // Reset realtime state — clear old subscription but do NOT reset
    // the completion flag yet (prevents stale data from old run being
    // treated as the new run's completion during the transition window)
    setRunId(null);
    setPublicToken(null);

    setState({
      status: "generating",
      phase: "content",
      progress: 0,
      html: "",
      rawContent: "",
      displayedHtml: "",
      wordCount: 0,
      statusMessage: "Starting generation...",
      elapsedTime: 0,
    });

    // Generate idempotency key to prevent double-clicks
    const generationRequestId = crypto.randomUUID();

    try {
      const selectedComponents = [
        ...requiredComponents.map((c) => c.id),
        ...Array.from(enabledComponents),
      ];

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(fingerprintRef.current && { "X-Fingerprint": fingerprintRef.current }),
        },
        body: JSON.stringify({
          articleType,
          topic: topic.trim(),
          variation,
          targetWordCount,
          selectedComponents,
          componentColor,
          variationName,
          provider,
          enableKeywordExpansion,
          enableAutoCorrection,
          backgroundTask: true, // Use Trigger.dev realtime mode
          skipImages,
          imageProvider,
          generationRequestId, // Idempotency key
          ...(Object.values(articleContext).some(
            (sub) => sub && typeof sub === "object" && Object.values(sub).some((v) => v && String(v).trim())
          )
            ? { articleContext }
            : {}),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        // Handle 402 (Payment Required) - show paywall modal
        if (response.status === 402) {
          const errorData = await response.json().catch(() => ({}));
          const tier = errorData.tier || "free";
          const resetsIn = errorData.resetsIn;
          const renewsIn = errorData.renewsIn;

          setPaywallTier(tier);
          setPaywallResetsIn(resetsIn);
          setPaywallRenewsIn(renewsIn);
          setShowPaywall(true);

          setState((prev) => ({
            ...prev,
            status: "idle",
            phase: "content",
            progress: 0,
            statusMessage: "",
          }));
          return;
        }

        const error = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || "Generation failed");
      }

      // Parse the JSON response (backgroundTask mode returns JSON, not SSE)
      const data = await response.json();
      const { runId: newRunId, publicToken: newToken, historyId } = data;

      // Set realtime subscription — reset completion flag and reveal state
      // AFTER setting the new runId so stale data from the old run can't trigger it
      realtimeCompleteHandledRef.current = false;
      structuredHtmlRef.current = "";
      revealBlocksRef.current = [];
      revealIndexRef.current = 0;
      if (revealIntervalRef.current) { clearInterval(revealIntervalRef.current); revealIntervalRef.current = null; }
      setRunId(newRunId);
      setPublicToken(newToken);
      setState((prev) => ({ ...prev, historyId }));

      // Store runId in URL and sessionStorage for reconnection
      const url = new URL(window.location.href);
      url.searchParams.set("runId", newRunId);
      window.history.replaceState({}, "", url.toString());
      
      // Store expanded state for instant restoration on reconnection
      try {
        sessionStorage.setItem("scai-active-run", JSON.stringify({
          runId: newRunId,
          historyId,
          formState: {
            topic: topic.trim(),
            articleType,
            variation,
            variationName,
            provider,
            targetWordCount,
            componentColor,
            enabledComponents: Array.from(enabledComponents),
            skipImages,
            imageProvider,
            enableKeywordExpansion,
            enableAutoCorrection,
          }
        }));
      } catch { /* ignore - quota exceeded or disabled */ }

    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setState((prev) => ({
          ...prev,
          status: "idle",
          phase: "content",
          progress: 0,
          statusMessage: "",
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        status: "error",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      }));
    }
  }, [
    topic,
    state.status,
    requiredComponents,
    enabledComponents,
    articleType,
    variation,
    componentColor,
    variationName,
    provider,
    targetWordCount,
    isUnlimited,
    estimatedCredits,
    userCreditBalance,
    monthlyResetsAt,
    userTier,
  ]);

  // Handle stop — only cancels on explicit user action, NOT on unmount
  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();

    // Cancel Trigger.dev run if active
    if (runId) {
      fetch("/api/generate/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      }).catch((err) => {
        console.error("[GeneratePage] Failed to cancel run:", err);
      });
      setRunId(null);
      setPublicToken(null);

      // Clean up URL param and sessionStorage
      const url = new URL(window.location.href);
      url.searchParams.delete("runId");
      window.history.replaceState({}, "", url.toString());
      try { sessionStorage.removeItem("scai-active-run"); } catch { /* ignore */ }
    }

    // Reset state to idle
    setState((prev) => ({
      ...prev,
      status: "idle",
      phase: "content",
      progress: 0,
      statusMessage: "",
    }));
  }, [runId]);

  // Handle reset
  const handleReset = useCallback(() => {
    setState(initialState);
    setTopic("");
    setRunId(null);
    setPublicToken(null);
    realtimeCompleteHandledRef.current = false;
    structuredHtmlRef.current = "";
    revealBlocksRef.current = [];
    revealIndexRef.current = 0;
    if (revealIntervalRef.current) { clearInterval(revealIntervalRef.current); revealIntervalRef.current = null; }

    // Clean up URL param and sessionStorage
    const url = new URL(window.location.href);
    url.searchParams.delete("runId");
    window.history.replaceState({}, "", url.toString());
    try { sessionStorage.removeItem("scai-active-run"); } catch { /* ignore */ }
  }, []);

  // Handle paywall upgrade
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
        const errorMessage = data.error || 'Failed to create subscription checkout';
        
        // Show user-friendly error based on status
        if (res.status === 401) {
          toast.error('Authentication required', {
            description: 'Please sign in again to continue.',
            duration: 5000,
          });
        } else if (res.status === 503) {
          toast.error('Payment system temporarily unavailable', {
            description: 'Please try again in a few moments.',
            duration: 5000,
          });
        } else {
          toast.error('Unable to start subscription', {
            description: errorMessage,
            duration: 5000,
          });
        }
        console.error('Checkout error:', errorMessage);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Unable to connect to payment system', {
        description: 'Please check your connection and try again.',
        duration: 5000,
      });
    }
  }, []);

  // Handle paywall buy credits
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
        const errorMessage = data.error || 'Failed to create credit checkout';
        
        // Show user-friendly error based on status
        if (res.status === 401) {
          toast.error('Authentication required', {
            description: 'Please sign in again to continue.',
            duration: 5000,
          });
        } else if (res.status === 503) {
          toast.error('Payment system temporarily unavailable', {
            description: 'Please try again in a few moments.',
            duration: 5000,
          });
        } else {
          toast.error('Unable to purchase credits', {
            description: errorMessage,
            duration: 5000,
          });
        }
        console.error("Credit purchase error:", errorMessage);
      }
    } catch (error) {
      console.error("Credit purchase error:", error);
      toast.error('Unable to connect to payment system', {
        description: 'Please check your connection and try again.',
        duration: 5000,
      });
    }
  }, []);

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] max-h-[calc(100vh-5.5rem)]">
        {/* Page Header */}
        <div className="flex-shrink-0 flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Generate</span>
              {" "}Article
            </h1>
            <p className="text-xs text-scai-text-muted mt-0.5">
              AI-powered SEO content engine with real-time preview
            </p>
          </div>
          {/* Status indicator when generating */}
          {state.status === "generating" && (
            <div className="flex items-center gap-2 rounded-xl bg-scai-brand1/8 border border-scai-brand1/15 px-3.5 py-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-scai-brand1 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-scai-brand1" />
              </span>
              <span className="text-xs font-medium text-scai-brand1">Generating</span>
            </div>
          )}
        </div>

        {/* Main content area */}
        <div className="flex flex-1 min-h-0 gap-4 lg:flex-row flex-col">
          {/* Left Panel - Form */}
          <GeneratorForm
            topic={topic}
            articleType={articleType}
            variation={variation}
            targetWordCount={targetWordCount}
            provider={provider}
            enableKeywordExpansion={enableKeywordExpansion}
            enableAutoCorrection={enableAutoCorrection}
            skipImages={skipImages}
            imageProvider={imageProvider}
            isGenerating={state.status === "generating"}
            allowedImageProviders={allowedImageProviders}
            estimatedCredits={estimatedCredits}
            userCreditBalance={userCreditBalance}
            isCalculatingCredits={isCalculatingCredits}
            onTopicChange={setTopic}
            onArticleTypeChange={handleArticleTypeChange}
            onVariationChange={setVariation}
            onTargetWordCountChange={setTargetWordCount}
            onProviderChange={setProvider}
            onKeywordExpansionChange={setEnableKeywordExpansion}
            onAutoCorrectionChange={setEnableAutoCorrection}
            onSkipImagesChange={setSkipImages}
            onImageProviderChange={setImageProvider}
            onGenerate={handleGenerate}
            onStop={handleStop}
            articleContext={articleContext}
            onArticleContextChange={setArticleContext}
            savedBusinesses={savedBusinesses}
            onRefreshSavedBusinesses={fetchSavedBusinesses}
            savedCommercialProfiles={savedCommercialProfiles}
            onRefreshSavedCommercialProfiles={fetchSavedCommercialProfiles}
          />

          {/* Right Panel - Preview */}
          <div data-tour="preview-panel" className="flex flex-1 min-h-0">
            <ArticlePreview
              ref={previewRef}
              state={state}
              topic={topic}
              articleType={articleType}
              variation={variation}
              onReset={handleReset}
              validation={state.validation}
              showValidation={showValidation}
              elapsedTime={state.elapsedTime}
            />
          </div>
        </div>
      </div>

      {/* Paywall Modal */}
      <CreditExhaustedModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        tier={paywallTier}
        resetsIn={paywallResetsIn}
        renewsIn={paywallRenewsIn}
        onUpgrade={handlePaywallUpgrade}
        onBuyCredits={handlePaywallBuyCredits}
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
    </>
  );
}
