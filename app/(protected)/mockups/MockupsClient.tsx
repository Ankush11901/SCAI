"use client";

import { useState, useMemo, useCallback } from "react";
import { ARTICLE_TYPES } from "@/data/article-types";
import {
  generateMockup,
  getMockupContent,
  VARIATION_ORDER,
  getVariationTheme,
  getPageBackground,
  type ArticleTypeId,
  type TitleFormat,
  type BaseVariationName,
} from "@/lib/mockups";
import {
  FileText,
  Download,
  Palette,
  Type,
  Monitor,
  Tablet,
  Smartphone,
  Copy,
  Check,
  Sparkles,
  Eye,
  Code,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

type ViewportSize = "desktop" | "tablet" | "mobile";
type ViewMode = "preview" | "code";

const VIEWPORT_SIZES: Record<ViewportSize, { width: string; label: string }> = {
  desktop: { width: "100%", label: "Desktop" },
  tablet: { width: "768px", label: "Tablet" },
  mobile: { width: "375px", label: "Mobile" },
};

const TITLE_FORMAT_OPTIONS: {
  value: TitleFormat;
  label: string;
  icon: string;
}[] = [
  { value: "question", label: "Question", icon: "?" },
  { value: "statement", label: "Statement", icon: "." },
  { value: "listicle", label: "Listicle", icon: "#" },
];

/**
 * Full Article Mockups Page - Client Component
 * Uses same layout as Generate page - left panel for controls, right for preview
 */
export default function MockupsClient() {
  // Selection state
  const [selectedArticleType, setSelectedArticleType] =
    useState<ArticleTypeId>("affiliate");
  const [selectedVariation, setSelectedVariation] =
    useState<BaseVariationName>("Clean Studio");
  const [selectedTitleFormat, setSelectedTitleFormat] =
    useState<TitleFormat>("statement");

  // UI state
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [copiedType, setCopiedType] = useState<"html" | "css" | null>(null);

  // Get content for selected article type
  const content = useMemo(() => {
    return getMockupContent(selectedArticleType);
  }, [selectedArticleType]);

  // Generate mockup
  const mockup = useMemo(() => {
    if (!content || !("primaryKeyword" in content)) return null;

    return generateMockup({
      articleType: selectedArticleType,
      content,
      variationName: selectedVariation,
      titleFormat: selectedTitleFormat,
    });
  }, [selectedArticleType, content, selectedVariation, selectedTitleFormat]);

  // Get theme for styling
  const theme = useMemo(() => {
    return getVariationTheme(selectedVariation);
  }, [selectedVariation]);

  // Get page background based on theme
  const pageBackground = useMemo(() => {
    return getPageBackground(theme);
  }, [theme]);

  // Copy handlers
  const handleCopy = useCallback(
    async (type: "html" | "css") => {
      if (!mockup) return;

      const text = type === "html" ? mockup.html : mockup.css;
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    },
    [mockup],
  );

  // Export as HTML file
  const handleExport = useCallback(() => {
    if (!mockup) return;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content?.titles[selectedTitleFormat] || "Article Mockup"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
    ${mockup.css}
  </style>
</head>
<body>
  ${mockup.html}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mockup-${selectedArticleType}-${selectedVariation
      .toLowerCase()
      .replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [
    mockup,
    content,
    selectedArticleType,
    selectedVariation,
    selectedTitleFormat,
  ]);

  // Build iframe srcDoc - mockup.css now contains all needed CSS (theme variables + base + component styles)
  const iframeSrcDoc = useMemo(() => {
    if (!mockup) return "";

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${mockup.css}
  </style>
</head>
<body style="background: ${pageBackground};">
  ${mockup.html}
</body>
</html>`;
  }, [mockup, pageBackground]);

  return (
    <div className="flex h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] flex-col gap-6 lg:flex-row">
      {/* Left Panel - Controls */}
      <div className="flex max-h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-xl border border-scai-border bg-scai-card lg:w-[380px]">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-scai-border p-5">
          <h1 className="mb-0.5 text-lg font-bold">Article Mockups</h1>
          <p className="text-sm text-scai-text-sec">
            Preview complete articles with design variations
          </p>
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Article Type */}
          <div>
            <label className="mb-2 block flex items-center gap-2 text-sm font-medium text-scai-text-sec">
              <FileText className="h-4 w-4" />
              Article Type
            </label>
            <Select
              value={selectedArticleType}
              onValueChange={(value) =>
                setSelectedArticleType(value as ArticleTypeId)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select article type" />
              </SelectTrigger>
              <SelectContent>
                {ARTICLE_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title Format */}
          <div>
            <label className="mb-2 block flex items-center gap-2 text-sm font-medium text-scai-text-sec">
              <Type className="h-4 w-4" />
              Title Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TITLE_FORMAT_OPTIONS.map((format) => (
                <button
                  key={format.value}
                  onClick={() => setSelectedTitleFormat(format.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                    selectedTitleFormat === format.value
                      ? "bg-scai-brand1/10 border-2 border-scai-brand1"
                      : "bg-scai-surface border-2 border-transparent hover:border-scai-border"
                  }`}
                >
                  <span className="text-lg font-bold">{format.icon}</span>
                  <span
                    className={`text-xs font-medium ${
                      selectedTitleFormat === format.value
                        ? "text-scai-brand1"
                        : "text-scai-text-sec"
                    }`}
                  >
                    {format.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Design Variation */}
          <div>
            <label className="mb-2 block flex items-center gap-2 text-sm font-medium text-scai-text-sec">
              <Palette className="h-4 w-4" />
              Design Variation
            </label>
            <div className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
              {VARIATION_ORDER.map((name) => {
                const variationTheme = getVariationTheme(name);
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedVariation(name)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${
                      selectedVariation === name
                        ? "bg-scai-brand1/10 border-2 border-scai-brand1"
                        : "bg-scai-surface border-2 border-transparent hover:border-scai-border"
                    }`}
                  >
                    {/* Color preview */}
                    <div
                      className="h-7 w-7 flex-shrink-0 rounded-md"
                      style={{
                        background: variationTheme.colors.background,
                        border: `2px solid ${variationTheme.colors.border}`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`font-medium text-sm truncate ${
                          selectedVariation === name
                            ? "text-scai-brand1"
                            : "text-scai-text"
                        }`}
                      >
                        {name}
                      </div>
                      <div className="truncate text-xs text-scai-text-muted">
                        {variationTheme.isDark ? "Dark" : "Light"} theme
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          {mockup && (
            <div className="border-t border-scai-border pt-4">
              <label className="mb-2 block flex items-center gap-2 text-sm font-medium text-scai-text-sec">
                <Sparkles className="h-4 w-4" />
                Mockup Stats
              </label>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-scai-surface p-2">
                  <div className="text-lg font-bold text-scai-text">
                    {mockup.metadata.wordCount}
                  </div>
                  <div className="text-[10px] text-scai-text-muted">Words</div>
                </div>
                <div className="rounded-lg bg-scai-surface p-2">
                  <div className="text-lg font-bold text-scai-text">
                    {mockup.metadata.componentCount}
                  </div>
                  <div className="text-[10px] text-scai-text-muted">
                    Components
                  </div>
                </div>
                <div className="rounded-lg bg-scai-surface p-2">
                  <div className="text-lg font-bold text-scai-text">
                    {theme.isDark ? "Dark" : "Light"}
                  </div>
                  <div className="text-[10px] text-scai-text-muted">Theme</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t border-scai-border p-4">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleExport}
            disabled={!mockup}
          >
            <Download className="mr-2 h-4 w-4" />
            Export HTML
          </Button>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-scai-border bg-scai-card">
        {/* Preview Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-scai-border p-4">
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg bg-scai-input p-1">
              <button
                onClick={() => setViewMode("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === "preview"
                    ? "bg-scai-card shadow-sm text-scai-text"
                    : "text-scai-text-sec hover:text-scai-text"
                }`}
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button
                onClick={() => setViewMode("code")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === "code"
                    ? "bg-scai-card shadow-sm text-scai-text"
                    : "text-scai-text-sec hover:text-scai-text"
                }`}
              >
                <Code className="h-4 w-4" />
                Code
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport toggles */}
            <div className="flex items-center rounded-lg bg-scai-input p-1">
              {(Object.keys(VIEWPORT_SIZES) as ViewportSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setViewport(size)}
                  className={`p-2 rounded-md transition-all ${
                    viewport === size
                      ? "bg-scai-card shadow-sm text-scai-text"
                      : "text-scai-text-sec hover:text-scai-text"
                  }`}
                  title={VIEWPORT_SIZES[size].label}
                >
                  {size === "desktop" && <Monitor className="h-4 w-4" />}
                  {size === "tablet" && <Tablet className="h-4 w-4" />}
                  {size === "mobile" && <Smartphone className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden bg-scai-surface p-4">
          {viewMode === "preview" ? (
            /* Live Preview with iframe */
            <div
              className="mx-auto h-full overflow-hidden rounded-xl bg-white shadow-lg transition-all duration-300"
              style={{
                width: VIEWPORT_SIZES[viewport].width,
                maxWidth: "100%",
              }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-scai-border bg-scai-input px-4 py-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-block rounded-md bg-scai-card px-4 py-1 text-xs text-scai-text-muted">
                    {selectedArticleType}.article.preview
                  </div>
                </div>
              </div>

              {/* Iframe preview */}
              {mockup ? (
                <iframe
                  srcDoc={iframeSrcDoc}
                  className="h-[calc(100%-40px)] w-full border-0"
                  title="Article Mockup Preview"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="flex h-[calc(100%-40px)] items-center justify-center text-scai-text-muted">
                  <div className="text-center">
                    <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin" />
                    <p>Generating mockup...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Code View */
            <div className="h-full overflow-auto">
              <Tabs defaultValue="html" className="h-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                </TabsList>

                <TabsContent value="html" className="mt-0">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 z-10"
                      onClick={() => handleCopy("html")}
                    >
                      {copiedType === "html" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <pre className="max-h-[calc(100vh-20rem)] overflow-x-auto rounded-lg bg-[#1e1e1e] p-4 text-sm text-[#d4d4d4]">
                      <code>{mockup?.html || "No mockup generated"}</code>
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="css" className="mt-0">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 z-10"
                      onClick={() => handleCopy("css")}
                    >
                      {copiedType === "css" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <pre className="max-h-[calc(100vh-20rem)] overflow-x-auto rounded-lg bg-[#1e1e1e] p-4 text-sm text-[#d4d4d4]">
                      <code>{mockup?.css || "No CSS generated"}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
