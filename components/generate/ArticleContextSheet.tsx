"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Briefcase,
  ArrowLeftRight,
  Star,
  ChevronRight,
  Save,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { GbpUrlField } from "@/components/generate/GbpUrlField";
import { toast } from "sonner";
import type {
  LocalBusinessInfo,
  CommercialProductInfo,
  ComparisonItemsInfo,
  ReviewProductInfo,
  ArticleTypeContext,
} from "@/lib/services/content-generators";

// ─── Types for saved profiles ────────────────────────────────────────────────

export type SavedBusinessProfile = {
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

export type SavedCommercialProfile = {
  id: string;
  label: string;
  productName?: string | null;
  category?: string | null;
  targetAudience?: string | null;
  painPoint?: string | null;
  keyBenefits?: string | null;
  keyFeatures?: string | null;
  uniqueValue?: string | null;
  ctaSuggestion?: string | null;
  pricePosition?: string | null;
};

// ─── Sheet config per article type ───────────────────────────────────────────

const SHEET_CONFIG: Record<
  string,
  { icon: typeof Building2; label: string; badge: string; badgeColor: string; title: string; description: string }
> = {
  local: {
    icon: Building2,
    label: "Business Information",
    badge: "Local SEO",
    badgeColor: "bg-scai-brand1/10 text-scai-brand1",
    title: "Business Information",
    description: "Enter your business details for accurate local SEO content. All fields are optional.",
  },
  commercial: {
    icon: Briefcase,
    label: "Product / Service Info",
    badge: "Commercial",
    badgeColor: "bg-info/10 text-info",
    title: "Product / Service Information",
    description: "Describe what you're promoting so the article is about YOUR product or service. All fields are optional.",
  },
  comparison: {
    icon: ArrowLeftRight,
    label: "Comparison Items",
    badge: "Comparison",
    badgeColor: "bg-warning/10 text-warning",
    title: "Comparison Items",
    description: "Specify the two items being compared. Leave blank to let AI determine them from your topic.",
  },
  review: {
    icon: Star,
    label: "Product Information",
    badge: "Review",
    badgeColor: "bg-success/10 text-success",
    title: "Product Information",
    description: "Specify the product being reviewed. Leave blank to infer from your topic.",
  },
};

const ARTICLE_TYPES_WITH_CONTEXT = ["local", "commercial", "comparison", "review"];

// ─── Price position options ──────────────────────────────────────────────────

const COMMERCIAL_PRICE_OPTIONS = [
  { value: "none", label: "Not specified" },
  { value: "budget", label: "Budget" },
  { value: "mid-range", label: "Mid-range" },
  { value: "premium", label: "Premium" },
  { value: "enterprise", label: "Enterprise" },
] as const;

const REVIEW_PRICE_OPTIONS = [
  { value: "none", label: "Not specified" },
  { value: "budget", label: "Budget" },
  { value: "mid-range", label: "Mid-range" },
  { value: "premium", label: "Premium" },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

interface ArticleContextSheetProps {
  articleType: string;
  articleContext: ArticleTypeContext;
  onArticleContextChange: (ctx: ArticleTypeContext) => void;
  isGenerating: boolean;
  savedBusinesses?: SavedBusinessProfile[];
  onRefreshSavedBusinesses?: () => void;
  savedCommercialProfiles?: SavedCommercialProfile[];
  onRefreshSavedCommercialProfiles?: () => void;
}

export function ArticleContextSheet({
  articleType,
  articleContext,
  onArticleContextChange,
  isGenerating,
  savedBusinesses,
  onRefreshSavedBusinesses,
  savedCommercialProfiles,
  onRefreshSavedCommercialProfiles,
}: ArticleContextSheetProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Auto-open when switching to a supported article type
  useEffect(() => {
    if (ARTICLE_TYPES_WITH_CONTEXT.includes(articleType)) {
      setSheetOpen(true);
      setSelectedProfileId("");
    }
  }, [articleType]);

  // Don't render for unsupported article types
  if (!ARTICLE_TYPES_WITH_CONTEXT.includes(articleType)) return null;

  const config = SHEET_CONFIG[articleType];
  const Icon = config.icon;

  // ─── Helpers for updating specific sub-contexts ──────────────────────────

  const updateLocal = (patch: Partial<LocalBusinessInfo>) =>
    onArticleContextChange({
      ...articleContext,
      localBusinessInfo: { ...articleContext.localBusinessInfo, ...patch },
    });

  const updateCommercial = (patch: Partial<CommercialProductInfo>) =>
    onArticleContextChange({
      ...articleContext,
      commercialInfo: { ...articleContext.commercialInfo, ...patch },
    });

  const updateComparison = (patch: Partial<ComparisonItemsInfo>) =>
    onArticleContextChange({
      ...articleContext,
      comparisonInfo: { ...articleContext.comparisonInfo, ...patch },
    });

  const updateReview = (patch: Partial<ReviewProductInfo>) =>
    onArticleContextChange({
      ...articleContext,
      reviewInfo: { ...articleContext.reviewInfo, ...patch },
    });

  // ─── Check if current context has data (for save button) ─────────────────

  const hasData = (() => {
    switch (articleType) {
      case "local":
        return Object.values(articleContext.localBusinessInfo || {}).some(
          (v) => v && String(v).trim()
        );
      case "commercial":
        return Object.values(articleContext.commercialInfo || {}).some(
          (v) => v && String(v).trim()
        );
      case "comparison":
        return Object.values(articleContext.comparisonInfo || {}).some(
          (v) => v && String(v).trim()
        );
      case "review":
        return Object.values(articleContext.reviewInfo || {}).some(
          (v) => v && String(v).trim()
        );
      default:
        return false;
    }
  })();

  // ─── Save profile logic ──────────────────────────────────────────────────

  const canSaveProfile = articleType === "local" || articleType === "commercial";

  const getDefaultSaveLabel = () => {
    if (articleType === "local") {
      const info = articleContext.localBusinessInfo || {};
      return (
        info.businessName?.trim() ||
        [info.city, info.stateRegion].filter(Boolean).join(", ") ||
        ""
      );
    }
    if (articleType === "commercial") {
      const info = articleContext.commercialInfo || {};
      return (
        info.productName?.trim() ||
        info.category?.trim() ||
        ""
      );
    }
    return "";
  };

  const handleSaveProfile = async (label: string) => {
    setSavingProfile(true);
    try {
      if (articleType === "local") {
        const res = await fetch("/api/user/businesses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, ...articleContext.localBusinessInfo }),
        });
        if (res.ok) {
          toast.success("Profile saved");
          onRefreshSavedBusinesses?.();
        } else {
          const data = await res.json();
          toast.error(data.error || "Failed to save");
        }
      } else if (articleType === "commercial") {
        const res = await fetch("/api/user/commercial-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, ...articleContext.commercialInfo }),
        });
        if (res.ok) {
          toast.success("Profile saved");
          onRefreshSavedCommercialProfiles?.();
        } else {
          const data = await res.json();
          toast.error(data.error || "Failed to save");
        }
      }
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Profile selector logic ──────────────────────────────────────────────

  const handleProfileSelect = (id: string) => {
    setSelectedProfileId(id);
    if (id === "new") {
      if (articleType === "local") {
        onArticleContextChange({ ...articleContext, localBusinessInfo: {} });
      } else if (articleType === "commercial") {
        onArticleContextChange({ ...articleContext, commercialInfo: {} });
      }
      return;
    }

    if (articleType === "local") {
      const profile = savedBusinesses?.find((b) => b.id === id);
      if (profile) {
        onArticleContextChange({
          ...articleContext,
          localBusinessInfo: {
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
          },
        });
      }
    } else if (articleType === "commercial") {
      const profile = savedCommercialProfiles?.find((p) => p.id === id);
      if (profile) {
        onArticleContextChange({
          ...articleContext,
          commercialInfo: {
            productName: profile.productName || undefined,
            category: profile.category || undefined,
            targetAudience: profile.targetAudience || undefined,
            painPoint: profile.painPoint || undefined,
            keyBenefits: profile.keyBenefits || undefined,
            keyFeatures: profile.keyFeatures || undefined,
            uniqueValue: profile.uniqueValue || undefined,
            ctaSuggestion: profile.ctaSuggestion || undefined,
            pricePosition: (profile.pricePosition as CommercialProductInfo["pricePosition"]) || undefined,
          },
        });
      }
    }
  };

  const savedProfiles =
    articleType === "local"
      ? savedBusinesses
      : articleType === "commercial"
        ? savedCommercialProfiles
        : undefined;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          disabled={isGenerating}
          className="w-full rounded-xl border border-scai-border bg-scai-surface p-4 text-left transition-all hover:border-scai-border-bright disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-scai-text-sec" />
              <span className="text-sm font-medium">{config.label}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${config.badgeColor}`}
              >
                {config.badge}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-scai-text-muted" />
          </div>
        </button>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>{config.title}</SheetTitle>
          <SheetDescription>{config.description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Saved profile selector (Local + Commercial only) */}
          {savedProfiles && savedProfiles.length > 0 && (
            <Select value={selectedProfileId} onValueChange={handleProfileSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Load a saved profile..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">-- New (blank) --</SelectItem>
                {savedProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* ─── Local fields ─────────────────────────────────────────── */}
          {articleType === "local" && (
            <LocalFields
              info={articleContext.localBusinessInfo || {}}
              onChange={updateLocal}
              onFullChange={(info) =>
                onArticleContextChange({ ...articleContext, localBusinessInfo: info })
              }
              isGenerating={isGenerating}
            />
          )}

          {/* ─── Commercial fields ────────────────────────────────────── */}
          {articleType === "commercial" && (
            <CommercialFields
              info={articleContext.commercialInfo || {}}
              onChange={updateCommercial}
              isGenerating={isGenerating}
            />
          )}

          {/* ─── Comparison fields ────────────────────────────────────── */}
          {articleType === "comparison" && (
            <ComparisonFields
              info={articleContext.comparisonInfo || {}}
              onChange={updateComparison}
              isGenerating={isGenerating}
            />
          )}

          {/* ─── Review fields ────────────────────────────────────────── */}
          {articleType === "review" && (
            <ReviewFields
              info={articleContext.reviewInfo || {}}
              onChange={updateReview}
              isGenerating={isGenerating}
            />
          )}
        </div>

        <SheetFooter>
          {canSaveProfile && (
            <>
              <Button
                variant="ghost"
                size="sm"
                disabled={savingProfile || isGenerating || !hasData}
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="w-4 h-4 mr-1.5" />
                {savingProfile ? "Saving..." : "Save as Profile"}
              </Button>
              <PromptDialog
                open={showSaveDialog}
                onOpenChange={setShowSaveDialog}
                title={articleType === "local" ? "Save Business Profile" : "Save Commercial Profile"}
                description="Give this profile a name so you can quickly select it later."
                label="Profile Label"
                placeholder={
                  articleType === "local"
                    ? "e.g. Portland Plumbing Co."
                    : "e.g. Acme CRM Product"
                }
                defaultValue={getDefaultSaveLabel()}
                confirmLabel="Save Profile"
                onConfirm={handleSaveProfile}
              />
            </>
          )}
          <SheetClose asChild>
            <Button variant="secondary">Done</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── LOCAL FIELDS ────────────────────────────────────────────────────────────

function LocalFields({
  info,
  onChange,
  onFullChange,
  isGenerating,
}: {
  info: LocalBusinessInfo;
  onChange: (patch: Partial<LocalBusinessInfo>) => void;
  onFullChange: (info: LocalBusinessInfo) => void;
  isGenerating: boolean;
}) {
  return (
    <>
      <Input
        label="Business Name"
        value={info.businessName || ""}
        onChange={(e) => onChange({ businessName: e.target.value })}
        placeholder="e.g. City Plumbing Co."
        disabled={isGenerating}
      />
      <PhoneInput
        label="Phone Number"
        value={info.phone || ""}
        onChange={(phone) => onChange({ phone })}
        disabled={isGenerating}
      />
      <Input
        label="Business Hours"
        value={info.hours || ""}
        onChange={(e) => onChange({ hours: e.target.value })}
        placeholder="e.g. Mon-Fri 8am-6pm, Sat 9am-3pm"
        disabled={isGenerating}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="City"
          value={info.city || ""}
          onChange={(e) => onChange({ city: e.target.value })}
          placeholder="e.g. Portland"
          disabled={isGenerating}
        />
        <Input
          label="State / Province / Region"
          value={info.stateRegion || ""}
          onChange={(e) => onChange({ stateRegion: e.target.value })}
          placeholder="e.g. OR or Ontario"
          disabled={isGenerating}
        />
      </div>
      <Input
        label="Postal Code"
        helperText="Optional"
        value={info.postalCode || ""}
        onChange={(e) => onChange({ postalCode: e.target.value })}
        placeholder="e.g. 97201 or M5V 3A8"
        disabled={isGenerating}
      />
      <Input
        label="Services Offered"
        value={info.servicesOffered || ""}
        onChange={(e) => onChange({ servicesOffered: e.target.value })}
        placeholder="e.g. Drain cleaning, pipe repair, water heater installation"
        disabled={isGenerating}
      />
      <GbpUrlField
        localBusinessInfo={info}
        onLocalBusinessInfoChange={onFullChange}
        disabled={isGenerating}
      />
    </>
  );
}

// ─── COMMERCIAL FIELDS ──────────────────────────────────────────────────────

function CommercialFields({
  info,
  onChange,
  isGenerating,
}: {
  info: CommercialProductInfo;
  onChange: (patch: Partial<CommercialProductInfo>) => void;
  isGenerating: boolean;
}) {
  return (
    <>
      <Input
        label="Product / Service Name"
        value={info.productName || ""}
        onChange={(e) => onChange({ productName: e.target.value })}
        placeholder="e.g. Acme CRM Pro"
        disabled={isGenerating}
      />
      <Input
        label="Category / Industry"
        value={info.category || ""}
        onChange={(e) => onChange({ category: e.target.value })}
        placeholder="e.g. SaaS, Consulting, Fitness"
        disabled={isGenerating}
      />
      <Input
        label="Target Audience"
        value={info.targetAudience || ""}
        onChange={(e) => onChange({ targetAudience: e.target.value })}
        placeholder="e.g. small business owners, freelancers"
        disabled={isGenerating}
      />
      <Input
        label="Pain Point"
        value={info.painPoint || ""}
        onChange={(e) => onChange({ painPoint: e.target.value })}
        placeholder="e.g. losing track of customer interactions"
        disabled={isGenerating}
        helperText="The primary problem your product solves"
      />
      <Textarea
        label="Key Benefits"
        value={info.keyBenefits || ""}
        onChange={(e) => onChange({ keyBenefits: e.target.value })}
        placeholder="e.g. Save 10 hours/week, Increase revenue by 25%, Never miss a follow-up"
        disabled={isGenerating}
        rows={2}
        helperText="Comma-separated value propositions"
      />
      <Textarea
        label="Key Features"
        value={info.keyFeatures || ""}
        onChange={(e) => onChange({ keyFeatures: e.target.value })}
        placeholder="e.g. AI-powered insights, Automated follow-ups, Custom dashboards"
        disabled={isGenerating}
        rows={2}
        helperText="Comma-separated main features"
      />
      <Input
        label="Unique Value Proposition"
        value={info.uniqueValue || ""}
        onChange={(e) => onChange({ uniqueValue: e.target.value })}
        placeholder="e.g. The only CRM built specifically for agencies"
        disabled={isGenerating}
        helperText="What makes it different from alternatives?"
      />
      <Input
        label="Call to Action"
        value={info.ctaSuggestion || ""}
        onChange={(e) => onChange({ ctaSuggestion: e.target.value })}
        placeholder="e.g. Start Free Trial, Get a Quote, Book a Demo"
        disabled={isGenerating}
      />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-scai-text">Price Positioning</label>
        <Select
          value={info.pricePosition || "none"}
          onValueChange={(val) =>
            onChange({
              pricePosition: (val === "none" ? undefined : val) as CommercialProductInfo["pricePosition"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Not specified" />
          </SelectTrigger>
          <SelectContent>
            {COMMERCIAL_PRICE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      </div>
    </>
  );
}

// ─── COMPARISON FIELDS ──────────────────────────────────────────────────────

function ComparisonFields({
  info,
  onChange,
  isGenerating,
}: {
  info: ComparisonItemsInfo;
  onChange: (patch: Partial<ComparisonItemsInfo>) => void;
  isGenerating: boolean;
}) {
  return (
    <>
      <Input
        label="Item A"
        value={info.itemA || ""}
        onChange={(e) => onChange({ itemA: e.target.value })}
        placeholder="e.g. iPhone 15 Pro"
        disabled={isGenerating}
      />
      <Input
        label="Item B"
        value={info.itemB || ""}
        onChange={(e) => onChange({ itemB: e.target.value })}
        placeholder="e.g. Samsung Galaxy S24 Ultra"
        disabled={isGenerating}
      />
      <Input
        label="Category"
        value={info.category || ""}
        onChange={(e) => onChange({ category: e.target.value })}
        placeholder="e.g. smartphones, project management tools"
        disabled={isGenerating}
      />
      <Textarea
        label="Comparison Criteria"
        value={info.criteria || ""}
        onChange={(e) => onChange({ criteria: e.target.value })}
        placeholder="e.g. Camera quality, Battery life, Price, Display, Performance"
        disabled={isGenerating}
        rows={2}
        helperText="Comma-separated aspects to compare"
      />
    </>
  );
}

// ─── REVIEW FIELDS ──────────────────────────────────────────────────────────

function ReviewFields({
  info,
  onChange,
  isGenerating,
}: {
  info: ReviewProductInfo;
  onChange: (patch: Partial<ReviewProductInfo>) => void;
  isGenerating: boolean;
}) {
  return (
    <>
      <Input
        label="Product Name"
        value={info.productName || ""}
        onChange={(e) => onChange({ productName: e.target.value })}
        placeholder="e.g. Sony WH-1000XM5"
        disabled={isGenerating}
        helperText="The exact name of what you're reviewing"
      />
      <Input
        label="Category"
        value={info.category || ""}
        onChange={(e) => onChange({ category: e.target.value })}
        placeholder="e.g. wireless headphones, gaming laptop"
        disabled={isGenerating}
      />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-scai-text">Price Point</label>
        <Select
          value={info.pricePoint || "none"}
          onValueChange={(val) =>
            onChange({
              pricePoint: (val === "none" ? undefined : val) as ReviewProductInfo["pricePoint"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Not specified" />
          </SelectTrigger>
          <SelectContent>
            {REVIEW_PRICE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
