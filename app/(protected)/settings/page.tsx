"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  User,
  FileText,
  Save,
  RotateCcw,
  Info,
  Link,
  Loader2,
  Image,
  ImagePlus,
  List,
  HelpCircle,
  Type,
  AlignLeft,
  TextCursorInput,
  CreditCard,
  BarChart3,
  Key,
  Shuffle,
  Palette,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { toast } from "sonner";
import { ARTICLE_TYPES } from "@/data/article-types";
import { COMPONENT_COLORS, ALL_VARIATION_NAMES } from "@/components/generate/GeneratorForm";
import { SettingsCard } from "@/components/ui/SettingsCard";
import { ToggleOption } from "@/components/ui/ToggleOption";
import { IntegrationsSettings } from "@/components/cms/IntegrationsSettings";
import { BillingTabContent } from "@/components/billing";
import { UsageTabContent } from "@/components/usage";
import { ApiTokensTabContent } from "@/components/api-tokens";
import { useQueryClient } from "@tanstack/react-query";
import { SavedBusinessesSection } from "@/components/settings/SavedBusinessesSection";
import { SavedCommercialProfilesSection } from "@/components/settings/SavedCommercialProfilesSection";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";

interface UserSettings {
  // Profile
  displayName: string;
  email: string;

  // Affiliate
  amazonAffiliateTag: string;

  // Default Generation Settings
  defaultArticleType: string;
  defaultTitleVariation: "question" | "statement" | "listicle";
  defaultWordCount: "short" | "medium" | "long";
  autoIncludeFeaturedImage: boolean;
  autoIncludeTOC: boolean;
  autoIncludeFAQ: boolean;
  autoIncludeH2Images: boolean;
  autoIncludeMetaTitle: boolean;
  autoIncludeMetaDescription: boolean;
  autoIncludeClosingSection: boolean;
  defaultDesignVariation: "random" | "Clean Studio" | "Airy Premium" | "Gradient Glow" | "Soft Stone";
  defaultComponentColor: "default" | "blue" | "green" | "amber" | "red" | "purple";
}

const DEFAULT_SETTINGS: UserSettings = {
  displayName: "SCAI User",
  email: "",
  amazonAffiliateTag: "",
  defaultArticleType: "informational",
  defaultTitleVariation: "question",
  defaultWordCount: "medium",
  autoIncludeFeaturedImage: true,
  autoIncludeTOC: true,
  autoIncludeFAQ: true,
  autoIncludeH2Images: true,
  autoIncludeMetaTitle: true,
  autoIncludeMetaDescription: true,
  autoIncludeClosingSection: false,
  defaultDesignVariation: "Clean Studio",
  defaultComponentColor: "default",
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Auto-select tab from URL query param (e.g. ?tab=billing after Stripe redirect)
  const [activeTab, setActiveTab] = useState("general");

  // Read tab from URL after hydration to avoid SSR mismatch
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
    // Refresh quota after returning from Stripe checkout
    if (params.get("success") === "true" || params.get("purchase") === "success") {
      queryClient.invalidateQueries({ queryKey: ["quota"] });
    }
  }, [queryClient]);

  // Load profile + generation preferences from DB
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/user/settings");
        if (response.ok) {
          const data = await response.json();
          const prefs = data.generationPreferences || {};
          setSettings((prev) => ({
            ...prev,
            displayName: data.name || prev.displayName,
            email: data.email || prev.email,
            amazonAffiliateTag: data.amazonAffiliateTag || "",
            // Generation preferences from DB
            ...(prefs.defaultArticleType && { defaultArticleType: prefs.defaultArticleType }),
            ...(prefs.defaultTitleVariation && { defaultTitleVariation: prefs.defaultTitleVariation }),
            ...(prefs.defaultWordCount && { defaultWordCount: prefs.defaultWordCount }),
            ...(prefs.autoIncludeFeaturedImage !== undefined && { autoIncludeFeaturedImage: prefs.autoIncludeFeaturedImage }),
            ...(prefs.autoIncludeTOC !== undefined && { autoIncludeTOC: prefs.autoIncludeTOC }),
            ...(prefs.autoIncludeFAQ !== undefined && { autoIncludeFAQ: prefs.autoIncludeFAQ }),
            ...(prefs.autoIncludeH2Images !== undefined && { autoIncludeH2Images: prefs.autoIncludeH2Images }),
            ...(prefs.autoIncludeMetaTitle !== undefined && { autoIncludeMetaTitle: prefs.autoIncludeMetaTitle }),
            ...(prefs.autoIncludeMetaDescription !== undefined && { autoIncludeMetaDescription: prefs.autoIncludeMetaDescription }),
            ...(prefs.autoIncludeClosingSection !== undefined && { autoIncludeClosingSection: prefs.autoIncludeClosingSection }),
            ...(prefs.defaultDesignVariation && { defaultDesignVariation: prefs.defaultDesignVariation }),
            ...(prefs.defaultComponentColor && { defaultComponentColor: prefs.defaultComponentColor }),
          }));

          // One-time migration: if DB has no preferences but localStorage does, save to DB
          if (!prefs.defaultArticleType) {
            try {
              const saved = localStorage.getItem("scai-settings");
              if (saved) {
                const local = JSON.parse(saved);
                if (local.defaultArticleType || local.defaultTitleVariation || local.defaultWordCount) {
                  await fetch("/api/user/settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ generationPreferences: local }),
                  });
                  setSettings((prev) => ({ ...prev, ...local }));
                  localStorage.removeItem("scai-settings");
                }
              }
            } catch {
              // Migration failed — non-critical
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch user settings:", error);
      }
      setProfileLoading(false);
    };

    loadProfile();
  }, []);

  const handleChange = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amazonAffiliateTag: settings.amazonAffiliateTag,
          generationPreferences: {
            defaultArticleType: settings.defaultArticleType,
            defaultTitleVariation: settings.defaultTitleVariation,
            defaultWordCount: settings.defaultWordCount,
            autoIncludeFeaturedImage: settings.autoIncludeFeaturedImage,
            autoIncludeTOC: settings.autoIncludeTOC,
            autoIncludeFAQ: settings.autoIncludeFAQ,
            autoIncludeH2Images: settings.autoIncludeH2Images,
            autoIncludeMetaTitle: settings.autoIncludeMetaTitle,
            autoIncludeMetaDescription: settings.autoIncludeMetaDescription,
            autoIncludeClosingSection: settings.autoIncludeClosingSection,
            defaultDesignVariation: settings.defaultDesignVariation,
            defaultComponentColor: settings.defaultComponentColor,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to save settings");
        setSaving(false);
        return;
      }

      setSaving(false);
      setHasChanges(false);
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
    toast.info("Settings reset to defaults");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-scai-brand1/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-scai-brand1" />
            </div>
            Settings
          </h1>
          <p className="text-scai-text-sec mt-1">
            Configure your profile, defaults, and preferences
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={handleReset} disabled={saving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="general">
            <User className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <FileText className="w-4 h-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Link className="w-4 h-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="usage">
            <BarChart3 className="w-4 h-4 mr-2" />
            Usage
          </TabsTrigger>
          <TabsTrigger value="api-tokens">
            <Key className="w-4 h-4 mr-2" />
            API Tokens
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-5">
          {profileLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-scai-brand1" />
            </div>
          ) : (
            <>
              {/* Two-column grid: Profile+Affiliate left, Businesses right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* Left column */}
                <div className="space-y-5">
                  <SettingsCard
                    icon={<User className="w-5 h-5 text-scai-brand1" />}
                    title="Profile"
                    description="Your account information"
                    delay={0}
                  >
                    <div className="space-y-4">
                      <Input
                        label="Display Name"
                        value={settings.displayName}
                        onChange={(e) => handleChange("displayName", e.target.value)}
                        placeholder="Your name"
                      />
                      <Input
                        label="Email"
                        type="email"
                        value={settings.email}
                        readOnly
                        className="opacity-60 cursor-not-allowed"
                        placeholder="your@email.com"
                      />
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    icon={<Link className="w-5 h-5 text-scai-brand2" />}
                    title="Affiliate Settings"
                    description="Amazon Associates configuration"
                    delay={0.1}
                  >
                    <div className="space-y-4">
                      <Input
                        label="Amazon Affiliate Tag"
                        value={settings.amazonAffiliateTag}
                        onChange={(e) =>
                          handleChange("amazonAffiliateTag", e.target.value)
                        }
                        placeholder="yourtag-20"
                      />
                      <div className="flex items-start gap-2.5 text-xs text-scai-text-sec bg-scai-surface rounded-lg p-3 border border-scai-border">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-scai-brand1" />
                        <p>
                          Your Amazon Associates tag will be automatically appended to
                          product links in generated affiliate articles. Format:{" "}
                          <code className="bg-scai-input px-1.5 py-0.5 rounded text-scai-brand1">
                            yourtag-20
                          </code>
                        </p>
                      </div>
                    </div>
                  </SettingsCard>
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  <SavedBusinessesSection />
                  <SavedCommercialProfilesSection />
                </div>
              </div>

              {/* Delete Account — compact banner spanning full width */}
              <DeleteAccountSection userEmail={settings.email} />
            </>
          )}
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <SettingsCard
            icon={<FileText className="w-5 h-5 text-scai-brand3" />}
            title="Default Generation Settings"
            description="Defaults used when creating new articles"
            delay={0}
          >
            <div className="space-y-6">
              {/* Default Article Type */}
              <div>
                <label className="block text-sm font-medium text-scai-text-sec mb-3">
                  Article Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ARTICLE_TYPES.map((type) => {
                    const isSelected = settings.defaultArticleType === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() =>
                          handleChange("defaultArticleType", type.id)
                        }
                        className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                          isSelected
                            ? "bg-scai-brand1/10 border-scai-brand1 font-medium"
                            : "bg-scai-surface border-scai-border hover:border-scai-border-bright text-scai-text-sec hover:text-scai-text"
                        }`}
                      >
                        <span className={isSelected ? "text-scai-brand1" : ""}>
                          {type.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Default Title Variation */}
              <div>
                <label className="block text-sm font-medium text-scai-text-sec mb-3">
                  Title Variation
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["question", "statement", "listicle"] as const).map((v) => {
                    const isSelected = settings.defaultTitleVariation === v;
                    return (
                      <button
                        key={v}
                        onClick={() => handleChange("defaultTitleVariation", v)}
                        className={`py-2.5 px-4 text-sm rounded-lg border transition-all ${
                          isSelected
                            ? "bg-scai-brand1/10 border-scai-brand1 font-medium"
                            : "bg-scai-surface border-scai-border hover:border-scai-border-bright text-scai-text-sec hover:text-scai-text"
                        }`}
                      >
                        <span className={isSelected ? "text-scai-brand1" : ""}>
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Default Word Count */}
              <div>
                <label className="block text-sm font-medium text-scai-text-sec mb-3">
                  Word Count Target
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "short", label: "Short", desc: "~500 words" },
                    { id: "medium", label: "Medium", desc: "~1000 words" },
                    { id: "long", label: "Long", desc: "~1500 words" },
                  ] as const).map((option) => {
                    const isSelected = settings.defaultWordCount === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() =>
                          handleChange("defaultWordCount", option.id)
                        }
                        className={`py-2.5 px-4 rounded-lg border transition-all text-left ${
                          isSelected
                            ? "bg-scai-brand1/10 border-scai-brand1"
                            : "bg-scai-surface border-scai-border hover:border-scai-border-bright"
                        }`}
                      >
                        <div className={`text-sm font-medium ${isSelected ? "text-scai-brand1" : "text-scai-text-sec"}`}>
                          {option.label}
                        </div>
                        <div
                          className={`text-xs mt-0.5 ${
                            isSelected
                              ? "text-scai-brand1/70"
                              : "text-scai-text-muted"
                          }`}
                        >
                          {option.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Default Design Variation */}
              <div>
                <label className="block text-sm font-medium text-scai-text-sec mb-3">
                  Design Variation
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleChange("defaultDesignVariation", "random")}
                    className={`py-2.5 px-4 text-sm rounded-lg border transition-all flex items-center justify-center gap-2 ${
                      settings.defaultDesignVariation === "random"
                        ? "bg-scai-brand1/10 border-scai-brand1 font-medium"
                        : "bg-scai-surface border-scai-border hover:border-scai-border-bright text-scai-text-sec hover:text-scai-text"
                    }`}
                  >
                    <Shuffle className="h-3 w-3" />
                    <span className={settings.defaultDesignVariation === "random" ? "text-scai-brand1" : ""}>
                      Random
                    </span>
                  </button>
                  {ALL_VARIATION_NAMES.map((name) => {
                    const isSelected = settings.defaultDesignVariation === name;
                    return (
                      <button
                        key={name}
                        onClick={() => handleChange("defaultDesignVariation", name)}
                        className={`py-2.5 px-4 text-sm rounded-lg border transition-all ${
                          isSelected
                            ? "bg-scai-brand1/10 border-scai-brand1 font-medium"
                            : "bg-scai-surface border-scai-border hover:border-scai-border-bright text-scai-text-sec hover:text-scai-text"
                        }`}
                      >
                        <span className={isSelected ? "text-scai-brand1" : ""}>
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-scai-text-muted">
                  {settings.defaultDesignVariation === "random"
                    ? "A random design will be selected based on article content"
                    : `Articles will use the "${settings.defaultDesignVariation}" design style`}
                </p>
              </div>

              {/* Default Component Color */}
              <div>
                <label className="block text-sm font-medium text-scai-text-sec mb-3">
                  Component Colors
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COMPONENT_COLORS.map((color) => {
                    const isSelected = settings.defaultComponentColor === color.id;
                    return (
                      <button
                        key={color.id}
                        onClick={() => handleChange("defaultComponentColor", color.id as UserSettings["defaultComponentColor"])}
                        className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                          isSelected
                            ? "border-scai-brand1 bg-scai-brand1/5"
                            : "border-scai-border hover:border-scai-brand1/50"
                        }`}
                      >
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-full border-2"
                          style={{ borderColor: color.value, backgroundColor: color.bg }}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3" style={{ color: color.value }} />
                          )}
                        </div>
                        <span className="text-xs">{color.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-include Options */}
              <div>
                <label className="block text-sm font-medium text-scai-text-sec mb-3">
                  Auto-include Components
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <ToggleOption
                    icon={<Image className="w-4 h-4" />}
                    label="Featured Image"
                    description="Include a featured image placeholder"
                    checked={settings.autoIncludeFeaturedImage}
                    onChange={(v) =>
                      handleChange("autoIncludeFeaturedImage", v)
                    }
                  />
                  <ToggleOption
                    icon={<List className="w-4 h-4" />}
                    label="Table of Contents"
                    description="Add a table of contents for longer articles"
                    checked={settings.autoIncludeTOC}
                    onChange={(v) => handleChange("autoIncludeTOC", v)}
                  />
                  <ToggleOption
                    icon={<HelpCircle className="w-4 h-4" />}
                    label="FAQ Section"
                    description="Include a FAQ section at the end"
                    checked={settings.autoIncludeFAQ}
                    onChange={(v) => handleChange("autoIncludeFAQ", v)}
                  />
                  <ToggleOption
                    icon={<ImagePlus className="w-4 h-4" />}
                    label="Section Images"
                    description="Generate AI images for each H2 section"
                    checked={settings.autoIncludeH2Images}
                    onChange={(v) => handleChange("autoIncludeH2Images", v)}
                  />
                  <ToggleOption
                    icon={<Type className="w-4 h-4" />}
                    label="Meta Title"
                    description="Generate an SEO meta title"
                    checked={settings.autoIncludeMetaTitle}
                    onChange={(v) => handleChange("autoIncludeMetaTitle", v)}
                  />
                  <ToggleOption
                    icon={<AlignLeft className="w-4 h-4" />}
                    label="Meta Description"
                    description="Generate an SEO meta description"
                    checked={settings.autoIncludeMetaDescription}
                    onChange={(v) => handleChange("autoIncludeMetaDescription", v)}
                  />
                  <ToggleOption
                    icon={<TextCursorInput className="w-4 h-4" />}
                    label="Closing Section"
                    description="Add a closing H2 with summary paragraph"
                    checked={settings.autoIncludeClosingSection}
                    onChange={(v) => handleChange("autoIncludeClosingSection", v)}
                  />
                </div>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <IntegrationsSettings />
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <BillingTabContent />
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <UsageTabContent />
        </TabsContent>

        {/* API Tokens Tab */}
        <TabsContent value="api-tokens" className="space-y-6">
          <ApiTokensTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
