"use client";

import { useState, useEffect } from "react";
import { Play, Loader2, Link2, Building2, Save, Coins, ChevronRight, Network, Check } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetFooter,
} from "@/components/ui/Sheet";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { GbpUrlField } from "@/components/generate/GbpUrlField";
import { ARTICLE_TYPES } from "@/data/article-types";
import { ARTICLE_TYPE_ICONS } from "@/data/article-type-icons";
import {
  IMAGE_PROVIDERS,
  type ImageProvider,
} from "@/components/generate/GeneratorForm";
import type { LocalBusinessInfo } from "@/lib/services/content-generators";
import { InfoTip } from "@/components/ui/InfoTip";
import Image from "next/image";

export type TitleVariation = "question" | "statement" | "listicle";

export type SavedBusiness = {
  id: string;
  label: string;
  businessName?: string | null;
  phone?: string | null;
  hours?: string | null;
  city?: string | null;
  stateRegion?: string | null;
  postalCode?: string | null;
  servicesOffered?: string | null;
  email?: string | null;
  website?: string | null;
  gbpUrl?: string | null;
};

export interface ClusterInput {
  topic: string;
  primaryKeyword: string;
  urlPattern: string;
  articleCount: number;
  variation: TitleVariation;
  variations: TitleVariation[];
  allowedArticleTypes?: string[];
  aiChooseVariants?: boolean;
}

interface ClusterModeFormProps {
  isStarting: boolean;
  hasRunningJob: boolean;
  imageProvider: ImageProvider;
  allowedImageProviders?: ImageProvider[];
  onImageProviderChange: (value: ImageProvider) => void;
  onStart: (input: ClusterInput) => void;
  localBusinessInfo: LocalBusinessInfo;
  onLocalBusinessInfoChange: (info: LocalBusinessInfo) => void;
  savedBusinesses?: SavedBusiness[];
  onRefreshSavedBusinesses?: () => void;
}

export function ClusterModeForm({
  isStarting,
  hasRunningJob,
  imageProvider,
  allowedImageProviders,
  onImageProviderChange,
  onStart,
  localBusinessInfo,
  onLocalBusinessInfoChange,
  savedBusinesses,
  onRefreshSavedBusinesses,
}: ClusterModeFormProps) {
  const [topic, setTopic] = useState("");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [urlPattern, setUrlPattern] = useState("/blog/{slug}");
  const [articleCount, setArticleCount] = useState(5);
  const [selectedVariations, setSelectedVariations] = useState<TitleVariation[]>(["statement"]);

  // Article type pool
  const [allowedArticleTypes, setAllowedArticleTypes] = useState<string[]>([]);

  // Business info sheet
  const [businessSheetOpen, setBusinessSheetOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [showSaveProfileDialog, setShowSaveProfileDialog] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Credit estimate state (self-contained — no parent props needed)
  const [estimatedCredits, setEstimatedCredits] = useState<number | undefined>();
  const [userCreditBalance, setUserCreditBalance] = useState<number | undefined>();
  const [isCalculatingCredits, setIsCalculatingCredits] = useState(false);

  // Fetch credit balance on mount
  useEffect(() => {
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setUserCreditBalance(data.credits?.available ?? 0);
      })
      .catch(() => {});
  }, []);

  // Debounced bulk credit estimate
  useEffect(() => {
    const timeout = setTimeout(async () => {
      setIsCalculatingCredits(true);
      try {
        const res = await fetch("/api/credits/estimate-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wordCount: 1000,
            imageProvider,
            allowedArticleTypes,
            articleCount,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setEstimatedCredits(data.totalCredits);
        }
      } catch {
        // silent — estimate is informational
      } finally {
        setIsCalculatingCredits(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [articleCount, allowedArticleTypes, imageProvider]);

  const inputsDisabled = isStarting;

  const hasBusinessData = Object.values(localBusinessInfo).some(
    (v) => v && String(v).trim()
  );

  const canStart =
    !isStarting &&
    topic.trim().length > 0 &&
    primaryKeyword.trim().length > 0 &&
    urlPattern.includes("{slug}") &&
    articleCount >= 1 &&
    articleCount <= 100 &&
    selectedVariations.length > 0;

  const handleStart = () => {
    if (!canStart) return;
    onStart({
      topic: topic.trim(),
      primaryKeyword: primaryKeyword.trim(),
      urlPattern: urlPattern.trim(),
      articleCount,
      variation: selectedVariations[0],
      variations: selectedVariations,
      allowedArticleTypes: allowedArticleTypes.length > 0 ? allowedArticleTypes : undefined,
      aiChooseVariants: selectedVariations.length > 1 ? true : undefined,
    });
  };

  const toggleArticleType = (typeId: string) => {
    setAllowedArticleTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((t) => t !== typeId)
        : [...prev, typeId]
    );
  };

  const selectAllTypes = () => {
    setAllowedArticleTypes(ARTICLE_TYPES.map((t) => t.id));
  };

  const clearAllTypes = () => {
    setAllowedArticleTypes([]);
  };

  return (
    <div className="flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-scai-border bg-scai-card">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-scai-border p-5">
        <h1 className="mb-0.5 text-lg font-bold">Content Cluster</h1>
        <p className="text-sm text-scai-text-sec">
          Generate interlinked articles with AI
        </p>
      </div>

      {/* Form Content */}
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* 1. Topic Input */}
        <div data-tour="cluster-topic">
          <Textarea
            label="Topic / Niche"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Home Fitness, Digital Photography, Organic Gardening"
            rows={2}
            disabled={inputsDisabled}
            helperText="The broad topic your article cluster will cover"
          />
        </div>

        {/* 2. Primary Keyword Input */}
        <div data-tour="cluster-keyword">
          <Textarea
            label="Primary Keyword"
            value={primaryKeyword}
            onChange={(e) => setPrimaryKeyword(e.target.value)}
            placeholder="e.g., home gym equipment, DSLR camera settings"
            rows={2}
            disabled={inputsDisabled}
            helperText="The main keyword to target across the cluster"
          />
        </div>

        {/* 3. Article Count Slider */}
        <div data-tour="cluster-count">
          <label className="mb-2 block text-sm font-medium text-scai-text-sec">
            Number of Articles
            <InfoTip text="How many interlinked articles to generate in this cluster." />
          </label>
          <Slider
            min={1}
            max={100}
            step={1}
            value={[articleCount]}
            onValueChange={([v]) => setArticleCount(v)}
            disabled={inputsDisabled}
            showValue={false}
          />
          <div className="mt-2 flex justify-between">
            <span className="text-sm text-scai-text">
              {articleCount} articles
            </span>
            <span className="text-xs text-scai-text-muted">
              1-100 range
            </span>
          </div>
        </div>

        {/* 4. Title Format (Multi-Select) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-scai-text-sec">
            Title Format
            <InfoTip text="Select one or more. When multiple are selected, AI picks the best fit per article." />
            {selectedVariations.length > 1 && <span className="ml-1 text-scai-brand1">(AI picks per article)</span>}
          </label>

          <div className="grid grid-cols-3 gap-2">
            {(["question", "statement", "listicle"] as const).map((v) => {
              const isSelected = selectedVariations.includes(v);
              return (
                <button
                  key={v}
                  onClick={() => {
                    setSelectedVariations((prev) => {
                      if (prev.includes(v)) {
                        if (prev.length === 1) return prev;
                        return prev.filter((x) => x !== v);
                      }
                      return [...prev, v];
                    });
                  }}
                  disabled={inputsDisabled}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border disabled:opacity-50 ${
                    isSelected
                      ? "bg-scai-brand1/10 border-scai-brand1 text-scai-brand1"
                      : "bg-scai-surface border-scai-border hover:border-scai-border-bright text-scai-text-sec hover:text-scai-text"
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-scai-text-muted mt-2">
            {selectedVariations.length === 1
              ? `All titles will use ${selectedVariations[0]} format`
              : `AI will pick from: ${selectedVariations.join(', ')}`}
          </p>
        </div>

        {/* 5. Article Type Pool — Icon card grid with multi-select */}
        <div data-tour="cluster-article-types">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-scai-text-sec">
              Article Type Pool
              <InfoTip text="Restrict which types AI can use. Leave empty to allow all types." />
            </label>
            <div className="flex gap-2">
              <button
                onClick={selectAllTypes}
                disabled={inputsDisabled}
                className="text-xs text-scai-brand1 hover:underline disabled:opacity-50"
              >
                Select All
              </button>
              <span className="text-scai-text-muted">|</span>
              <button
                onClick={clearAllTypes}
                disabled={inputsDisabled}
                className="text-xs text-scai-text-sec hover:underline disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ARTICLE_TYPES.map((type) => {
              const isSelected = allowedArticleTypes.includes(type.id);
              const icons = ARTICLE_TYPE_ICONS[type.id];
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleArticleType(type.id)}
                  disabled={inputsDisabled}
                  className={`relative flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 transition-all disabled:opacity-50 ${
                    isSelected
                      ? "border-scai-brand1 bg-scai-brand1/10"
                      : "border-scai-border bg-scai-surface hover:border-scai-border-bright"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-scai-brand1">
                      <Check className="h-2.5 w-2.5 text-scai-page" />
                    </div>
                  )}
                  {icons && (
                    <Image
                      src={isSelected ? icons.white : icons.grey}
                      alt={type.name}
                      width={24}
                      height={24}
                      className="h-6 w-6"
                    />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      isSelected ? "text-scai-brand1" : "text-scai-text-sec"
                    }`}
                  >
                    {type.name}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-scai-text-muted mt-2">
            {allowedArticleTypes.length === 0
              ? "AI will pick from all types"
              : `AI limited to ${allowedArticleTypes.length} type${allowedArticleTypes.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* 6. Image Quality — Segmented control */}
        <div data-tour="cluster-image-quality">
          <label className="mb-2 block text-sm font-medium text-scai-text-sec">
            Image Quality
            <InfoTip text="Standard is faster. Premium produces higher-detail AI images." />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {IMAGE_PROVIDERS.map((p) => {
              const isSelected = imageProvider === p.id;
              const isAllowed = !allowedImageProviders || allowedImageProviders.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => isAllowed && onImageProviderChange(p.id)}
                  disabled={inputsDisabled || !isAllowed}
                  className={`relative py-2.5 px-4 text-sm rounded-lg border transition-all disabled:opacity-50 ${
                    isSelected
                      ? "border-scai-brand1 bg-scai-brand1/10 font-medium"
                      : "bg-scai-surface border-scai-border hover:border-scai-border-bright text-scai-text-sec hover:text-scai-text"
                  } ${!isAllowed ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <span className={isSelected ? "text-scai-brand1" : ""}>
                    {p.name}
                  </span>
                  {!isAllowed && (
                    <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                      Upgrade
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 7. URL Pattern */}
        <div data-tour="cluster-url-pattern">
          <Input
            label="URL Pattern"
            value={urlPattern}
            onChange={(e) => setUrlPattern(e.target.value)}
            placeholder="/blog/{slug}"
            disabled={inputsDisabled}
            helperText="Use {slug} where the article slug should appear"
          />
          {!urlPattern.includes("{slug}") && urlPattern.trim() && (
            <p className="text-xs text-error mt-1">
              URL pattern must contain {"{slug}"}
            </p>
          )}
        </div>

        {/* 8. Business Information Sheet */}
        <Sheet open={businessSheetOpen} onOpenChange={setBusinessSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              disabled={inputsDisabled}
              className="w-full rounded-xl border border-scai-border bg-scai-surface p-4 text-left transition-all hover:border-scai-border-bright disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-scai-text-sec" />
                  <span className="text-sm font-medium">Business Information</span>
                  <span className="rounded bg-scai-brand1/10 px-1.5 py-0.5 text-[10px] font-medium text-scai-brand1">
                    Local SEO
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasBusinessData && (
                    <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                      Configured
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-scai-text-muted" />
                </div>
              </div>
              <p className="mt-1 text-xs text-scai-text-muted">
                {hasBusinessData
                  ? `${localBusinessInfo.businessName || "Business"} — used for local article types`
                  : "Optional — add business details for local article types in the cluster"}
              </p>
            </button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Business Information</SheetTitle>
              <SheetDescription>
                Enter your business details for accurate local SEO content.
                These will be used for any &quot;local&quot; articles in the cluster. All fields are optional.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {/* Saved Profile Selector */}
              {savedBusinesses && savedBusinesses.length > 0 && (
                <Select
                  value={selectedProfileId}
                  onValueChange={(id) => {
                    setSelectedProfileId(id);
                    if (id === "new") {
                      onLocalBusinessInfoChange({});
                    } else {
                      const profile = savedBusinesses.find((b) => b.id === id);
                      if (profile) {
                        onLocalBusinessInfoChange({
                          businessName: profile.businessName || undefined,
                          phone: profile.phone || undefined,
                          hours: profile.hours || undefined,
                          city: profile.city || undefined,
                          stateRegion: profile.stateRegion || undefined,
                          postalCode: profile.postalCode || undefined,
                          servicesOffered: profile.servicesOffered || undefined,
                          email: profile.email || undefined,
                          website: profile.website || undefined,
                          gbpUrl: profile.gbpUrl || undefined,
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Load a saved profile..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">-- New (blank) --</SelectItem>
                    {savedBusinesses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Business Info Fields */}
              <Input
                label="Business Name"
                value={localBusinessInfo.businessName || ""}
                onChange={(e) =>
                  onLocalBusinessInfoChange({
                    ...localBusinessInfo,
                    businessName: e.target.value,
                  })
                }
                placeholder="e.g. City Plumbing Co."
                disabled={inputsDisabled}
              />
              <PhoneInput
                label="Phone Number"
                value={localBusinessInfo.phone || ""}
                onChange={(phone) =>
                  onLocalBusinessInfoChange({
                    ...localBusinessInfo,
                    phone,
                  })
                }
                disabled={inputsDisabled}
              />
              <Input
                label="Business Hours"
                value={localBusinessInfo.hours || ""}
                onChange={(e) =>
                  onLocalBusinessInfoChange({
                    ...localBusinessInfo,
                    hours: e.target.value,
                  })
                }
                placeholder="e.g. Mon-Fri 8am-6pm, Sat 9am-3pm"
                disabled={inputsDisabled}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="City"
                  value={localBusinessInfo.city || ""}
                  onChange={(e) =>
                    onLocalBusinessInfoChange({
                      ...localBusinessInfo,
                      city: e.target.value,
                    })
                  }
                  placeholder="e.g. Portland"
                  disabled={inputsDisabled}
                />
                <Input
                  label="State / Province / Region"
                  value={localBusinessInfo.stateRegion || ""}
                  onChange={(e) =>
                    onLocalBusinessInfoChange({
                      ...localBusinessInfo,
                      stateRegion: e.target.value,
                    })
                  }
                  placeholder="e.g. OR or Ontario"
                  disabled={inputsDisabled}
                />
              </div>
              <Input
                label="Postal Code"
                helperText="Optional"
                value={localBusinessInfo.postalCode || ""}
                onChange={(e) =>
                  onLocalBusinessInfoChange({
                    ...localBusinessInfo,
                    postalCode: e.target.value,
                  })
                }
                placeholder="e.g. 97201 or M5V 3A8"
                disabled={inputsDisabled}
              />
              <Input
                label="Services Offered"
                value={localBusinessInfo.servicesOffered || ""}
                onChange={(e) =>
                  onLocalBusinessInfoChange({
                    ...localBusinessInfo,
                    servicesOffered: e.target.value,
                  })
                }
                placeholder="e.g. Drain cleaning, pipe repair, water heater installation"
                disabled={inputsDisabled}
              />
              <GbpUrlField
                localBusinessInfo={localBusinessInfo}
                onLocalBusinessInfoChange={onLocalBusinessInfoChange}
                disabled={inputsDisabled}
              />
            </div>
            <SheetFooter className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={savingProfile || inputsDisabled || !hasBusinessData}
                onClick={() => setShowSaveProfileDialog(true)}
              >
                <Save className="w-4 h-4 mr-1.5" />
                {savingProfile ? "Saving..." : "Save as Profile"}
              </Button>
              <PromptDialog
                open={showSaveProfileDialog}
                onOpenChange={setShowSaveProfileDialog}
                title="Save Business Profile"
                description="Give this profile a name so you can quickly select it later."
                label="Profile Label"
                placeholder="e.g. Portland Plumbing Co."
                defaultValue={
                  localBusinessInfo.businessName?.trim()
                  || [localBusinessInfo.city, localBusinessInfo.stateRegion].filter(Boolean).join(", ")
                  || ""
                }
                confirmLabel="Save Profile"
                onConfirm={async (label) => {
                  setSavingProfile(true);
                  try {
                    const res = await fetch("/api/user/businesses", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ label, ...localBusinessInfo }),
                    });
                    if (res.ok) {
                      toast.success("Profile saved");
                      onRefreshSavedBusinesses?.();
                    } else {
                      const data = await res.json();
                      toast.error(data.error || "Failed to save");
                    }
                  } catch {
                    toast.error("Failed to save profile");
                  } finally {
                    setSavingProfile(false);
                  }
                }}
              />
              <SheetClose asChild>
                <Button variant="secondary">Done</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* 9. Interlinking Info */}
        <div className="flex gap-2 p-3 bg-scai-surface rounded-lg">
          <Link2 className="w-4 h-4 text-scai-brand1 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-scai-text-sec">
            Articles will be automatically interlinked for SEO.
          </p>
        </div>
      </div>

      {/* Generate Button */}
      <div data-tour="cluster-generate" className="flex-shrink-0 border-t border-scai-border p-5">
        {estimatedCredits !== undefined && userCreditBalance !== undefined && (
          <div className="mb-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-scai-text-sec">
              {isCalculatingCredits ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Coins className="h-3.5 w-3.5" />
              )}
              <span>
                {isCalculatingCredits ? "Calculating..." : `~${estimatedCredits.toLocaleString()} credits`}
              </span>
            </div>
            <div
              className={`font-medium ${
                userCreditBalance >= estimatedCredits
                  ? "text-scai-brand1"
                  : userCreditBalance > 0
                    ? "text-amber-500"
                    : "text-error"
              }`}
            >
              {userCreditBalance.toLocaleString()} available
            </div>
          </div>
        )}

        {isStarting ? (
          <button
            disabled
            className="w-full py-3 rounded-xl bg-scai-brand1/50 text-scai-page font-semibold flex items-center justify-center gap-2"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            Planning Cluster...
          </button>
        ) : (
          <Button
            variant="primary"
            className="w-full py-3"
            onClick={handleStart}
            disabled={!canStart || hasRunningJob}
          >
            <Play className="w-5 h-5 mr-2" />
            {hasRunningJob
              ? "Job Running - Please Wait"
              : `Generate ${articleCount} Article Cluster`}
          </Button>
        )}

        {hasRunningJob && (
          <p className="text-xs text-scai-text-muted text-center mt-2">
            A bulk job is currently running. Please wait for it to complete.
          </p>
        )}
      </div>
    </div>
  );
}
