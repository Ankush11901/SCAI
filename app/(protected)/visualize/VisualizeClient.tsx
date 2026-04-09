"use client";

import { useState, useMemo } from "react";
import { ARTICLE_TYPES } from "@/data/article-types";
import { UNIVERSAL_COMPONENTS, UNIQUE_COMPONENTS } from "@/data/components";
import { COMPONENT_VARIATIONS } from "@/data/variations";
import {
  Eye,
  Download,
  FileJson,
  Layers,
  X,
  Copy,
  Check,
  Search,
  ChevronRight,
  Code,
  Palette,
  Box,
  Sparkles,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { PageTransition } from "@/components/ui/PageTransition";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { motion, AnimatePresence } from "motion/react";

type ComponentType = {
  id: string;
  name: string;
  description: string;
  required: boolean;
  articleTypes?: string[];
};

/**
 * Component Visualizer Page - Client Component
 * Left: Component browser with search and filters
 * Right: Live preview with code tabs
 */
export default function VisualizeClient() {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedComponent, setSelectedComponent] =
    useState<ComponentType | null>(null);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [copiedType, setCopiedType] = useState<"html" | "css" | null>(null);
  const [previewViewport, setPreviewViewport] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");

  // Get all components - only include "Table of Contents" from UNIVERSAL_COMPONENTS
  const allowedUniversalComponents = UNIVERSAL_COMPONENTS.filter(
    (c) => c.id === "toc",
  );
  const allComponents = [...allowedUniversalComponents, ...UNIQUE_COMPONENTS];

  // Filter components based on selected type and search
  const filteredComponents = useMemo(() => {
    let components = allComponents;

    // Filter by article type
    if (selectedType !== "all") {
      const relevantUnique = UNIQUE_COMPONENTS.filter(
        (c) => c.articleTypes?.includes(selectedType) ?? false,
      );
      components = [...allowedUniversalComponents, ...relevantUnique];
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      components = components.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query),
      );
    }

    return components;
  }, [selectedType, searchQuery, allComponents]);

  // Get current component variations
  const currentVariations = selectedComponent
    ? COMPONENT_VARIATIONS[selectedComponent.id] || []
    : [];
  const currentVariation = currentVariations[selectedVariationIndex];

  // Check if component is universal (only toc is allowed)
  const isUniversal = (componentId: string) =>
    allowedUniversalComponents.some((c) => c.id === componentId);

  // Handle component selection
  const handleSelectComponent = (component: ComponentType) => {
    setSelectedComponent(component);
    setSelectedVariationIndex(0);
  };

  // Handle copy
  const handleCopy = async (type: "html" | "css") => {
    const content =
      type === "html" ? currentVariation?.html : currentVariation?.css;
    if (!content) return;

    await navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Handle download
  const handleDownload = () => {
    if (!selectedComponent || !currentVariation) return;

    const downloadBaseStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #000; background: #fff; padding: 2rem; max-width: 800px; margin: 0 auto; }
    h1, h2, h3, h4 { font-weight: 600; }
    a { color: #000; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    `;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${selectedComponent.name} - Variation ${
    selectedVariationIndex + 1
  }</title>
  <style>
    ${downloadBaseStyles}
    ${currentVariation.css || ""}
  </style>
</head>
<body>
  ${currentVariation.html}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedComponent.id}-variation-${
      selectedVariationIndex + 1
    }.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle export all
  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      articleTypes: ARTICLE_TYPES,
      components: {
        universal: allowedUniversalComponents,
        unique: UNIQUE_COMPONENTS,
      },
      variations: COMPONENT_VARIATIONS,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scai-component-documentation.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <PageTransition className="h-full">
      <div className="flex h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] flex-col gap-6 lg:flex-row">
        {/* Left Panel - Component Browser */}
        <div className="flex max-h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-xl border border-scai-border bg-scai-card lg:w-[380px]">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-scai-border p-5">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
                <Layers className="h-4 w-4 text-scai-page" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Component Visualizer</h1>
                <p className="text-xs text-scai-text-sec">
                  {filteredComponents.length} components
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-shrink-0 border-b border-scai-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-scai-text-muted" />
              <input
                type="text"
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-scai-border bg-scai-input py-2.5 pl-10 pr-4 text-sm focus:border-scai-brand1 focus:outline-none focus:ring-2 focus:ring-scai-brand1/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-scai-surface"
                  title="Clear search"
                >
                  <X className="h-3 w-3 text-scai-text-muted" />
                </button>
              )}
            </div>
          </div>

          {/* Article Type Filter */}
          <div className="flex-shrink-0 border-b border-scai-border p-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-scai-text-sec">
              Filter by Article Type
            </label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select article type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Components</SelectItem>
                {ARTICLE_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Component List */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {filteredComponents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 py-12 text-center"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-scai-surface">
                    <Search className="h-5 w-5 text-scai-text-muted" />
                  </div>
                  <p className="text-sm text-scai-text-sec">
                    No components found
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-2"
                >
                  {/* Universal Components Section */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wide text-scai-text-muted">
                      <Box className="h-3 w-3" />
                      Universal Components
                    </div>
                    <div className="space-y-1">
                      {filteredComponents
                        .filter((c) => isUniversal(c.id))
                        .map((component) => (
                          <ComponentListItem
                            key={component.id}
                            component={component}
                            isSelected={selectedComponent?.id === component.id}
                            variationCount={
                              (COMPONENT_VARIATIONS[component.id] || []).length
                            }
                            onClick={() => handleSelectComponent(component)}
                          />
                        ))}
                    </div>
                  </div>

                  {/* Unique Components Section */}
                  {filteredComponents.filter((c) => !isUniversal(c.id)).length >
                    0 && (
                    <div>
                      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wide text-scai-text-muted">
                        <Sparkles className="h-3 w-3" />
                        Unique Components
                      </div>
                      <div className="space-y-1">
                        {filteredComponents
                          .filter((c) => !isUniversal(c.id))
                          .map((component) => (
                            <ComponentListItem
                              key={component.id}
                              component={component}
                              isSelected={
                                selectedComponent?.id === component.id
                              }
                              variationCount={
                                (COMPONENT_VARIATIONS[component.id] || [])
                                  .length
                              }
                              onClick={() => handleSelectComponent(component)}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Export Footer */}
          <div className="flex-shrink-0 border-t border-scai-border p-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportJSON}
              leftIcon={<FileJson className="h-4 w-4" />}
              className="w-full"
            >
              Export All Components
            </Button>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-scai-border bg-scai-card">
          {selectedComponent ? (
            <>
              {/* Component Header */}
              <div className="flex-shrink-0 border-b border-scai-border p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h2 className="truncate text-xl font-semibold">
                        {selectedComponent.name}
                      </h2>
                      {selectedComponent.required && (
                        <span className="rounded bg-scai-brand1/10 px-2 py-0.5 text-xs font-medium text-scai-brand1">
                          Required
                        </span>
                      )}
                      {!isUniversal(selectedComponent.id) && (
                        <span className="rounded bg-scai-brand2/10 px-2 py-0.5 text-xs font-medium text-scai-brand2">
                          Unique
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm text-scai-text-sec">
                      {selectedComponent.description}
                    </p>
                    <code className="mt-2 inline-block rounded bg-scai-input px-2 py-0.5 text-xs text-scai-text-muted">
                      {selectedComponent.id}
                    </code>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownload}
                    leftIcon={<Download className="h-4 w-4" />}
                    className="ml-4 flex-shrink-0"
                  >
                    Download
                  </Button>
                </div>

                {/* Variation Selector */}
                {currentVariations.length > 1 && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-medium text-scai-text-sec">
                        Variations
                      </span>
                      <span className="rounded bg-scai-input px-1.5 py-0.5 text-[10px] font-medium text-scai-text-sec/60">
                        {currentVariations.length} styles
                      </span>
                    </div>
                    <div className="scrollbar-thin flex max-h-[120px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                      {currentVariations.map((v, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedVariationIndex(index)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                            selectedVariationIndex === index
                              ? "bg-scai-brand1 text-scai-page shadow-sm"
                              : "bg-scai-input border border-scai-border hover:border-scai-brand1/50 hover:bg-scai-card"
                          }`}
                          title={v.name}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs Content */}
              <Tabs
                defaultValue="preview"
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex-shrink-0 border-b border-scai-border px-5">
                  <TabsList className="h-12 gap-0 border-0 bg-transparent py-0">
                    <TabsTrigger
                      value="preview"
                      className="gap-2 rounded-none px-4 data-[state=active]:border-b-2 data-[state=active]:border-scai-brand1 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger
                      value="html"
                      className="gap-2 rounded-none px-4 data-[state=active]:border-b-2 data-[state=active]:border-scai-brand1 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      <Code className="h-4 w-4" />
                      HTML
                    </TabsTrigger>
                    <TabsTrigger
                      value="css"
                      className="gap-2 rounded-none px-4 data-[state=active]:border-b-2 data-[state=active]:border-scai-brand1 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      <Palette className="h-4 w-4" />
                      CSS
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Preview Tab */}
                <TabsContent
                  value="preview"
                  className="m-0 flex-1 overflow-hidden p-0"
                >
                  <div className="flex h-full flex-col">
                    {/* Viewport Toggle */}
                    <div className="flex items-center justify-center gap-1 border-b border-scai-border bg-scai-surface/30 py-2">
                      <button
                        onClick={() => setPreviewViewport("desktop")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          previewViewport === "desktop"
                            ? "bg-scai-brand1 text-scai-page shadow-sm"
                            : "text-scai-text-sec hover:bg-scai-input"
                        }`}
                        title="Desktop view"
                      >
                        <Monitor className="h-4 w-4" />
                        Desktop
                      </button>
                      <button
                        onClick={() => setPreviewViewport("tablet")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          previewViewport === "tablet"
                            ? "bg-scai-brand1 text-scai-page shadow-sm"
                            : "text-scai-text-sec hover:bg-scai-input"
                        }`}
                        title="Tablet view (768px)"
                      >
                        <Tablet className="h-4 w-4" />
                        Tablet
                      </button>
                      <button
                        onClick={() => setPreviewViewport("mobile")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          previewViewport === "mobile"
                            ? "bg-scai-brand1 text-scai-page shadow-sm"
                            : "text-scai-text-sec hover:bg-scai-input"
                        }`}
                        title="Mobile view (375px)"
                      >
                        <Smartphone className="h-4 w-4" />
                        Mobile
                      </button>
                    </div>

                    {/* Preview Container */}
                    <div className="flex-1 overflow-auto bg-gradient-to-br from-neutral-200 to-neutral-100 dark:from-gray-900 dark:to-gray-800">
                      <div
                        className={`mx-auto overflow-hidden rounded-xl bg-[#fafafa] shadow-xl transition-all duration-300 ${
                          previewViewport === "desktop"
                            ? "w-full"
                            : previewViewport === "tablet"
                              ? "max-w-[768px]"
                              : "max-w-[375px]"
                        }`}
                      >
                        <iframe
                          key={`${selectedComponent.id}-${selectedVariationIndex}-${previewViewport}`}
                          srcDoc={`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #000;
      background: #fafafa;
      font-size: 16px;
      padding: ${
        previewViewport === "mobile"
          ? "0.5rem"
          : previewViewport === "tablet"
            ? "1rem"
            : "2rem"
      };
      -webkit-font-smoothing: antialiased;
    }
    img { max-width: 100%; height: auto; }
    ${currentVariation?.css || ""}
  </style>
</head>
<body>
  ${currentVariation?.html || ""}
</body>
</html>`}
                          className="w-full border-0"
                          style={{ minHeight: "400px", height: "auto" }}
                          title="Component preview"
                          sandbox="allow-same-origin"
                          onLoad={(e) => {
                            const iframe = e.target as HTMLIFrameElement;
                            if (iframe.contentDocument) {
                              const height =
                                iframe.contentDocument.body.scrollHeight;
                              iframe.style.height =
                                Math.max(400, height + 40) + "px";
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* HTML Tab */}
                <TabsContent
                  value="html"
                  className="m-0 flex-1 overflow-auto p-0"
                >
                  <div className="flex h-full flex-col">
                    <div className="flex flex-shrink-0 items-center justify-between border-b border-scai-border bg-scai-surface/30 px-5 py-3">
                      <span className="text-xs font-medium uppercase tracking-wide text-scai-text-muted">
                        HTML Code
                      </span>
                      <button
                        onClick={() => handleCopy("html")}
                        className="flex items-center gap-1.5 rounded-lg border border-scai-border bg-scai-input px-3 py-1.5 text-xs font-medium transition-colors hover:border-scai-brand1/50"
                      >
                        {copiedType === "html" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto bg-scai-page p-5">
                      <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-scai-text-sec">
                        {currentVariation?.html || ""}
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                {/* CSS Tab */}
                <TabsContent
                  value="css"
                  className="m-0 flex-1 overflow-auto p-0"
                >
                  <div className="flex h-full flex-col">
                    <div className="flex flex-shrink-0 items-center justify-between border-b border-scai-border bg-scai-surface/30 px-5 py-3">
                      <span className="text-xs font-medium uppercase tracking-wide text-scai-text-muted">
                        CSS Styles
                      </span>
                      <button
                        onClick={() => handleCopy("css")}
                        className="flex items-center gap-1.5 rounded-lg border border-scai-border bg-scai-input px-3 py-1.5 text-xs font-medium transition-colors hover:border-scai-brand1/50"
                        disabled={!currentVariation?.css}
                      >
                        {copiedType === "css" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto bg-scai-page p-5">
                      <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-scai-text-sec">
                        {currentVariation?.css ||
                          "/* No custom CSS for this variation */"}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            /* Empty State */
            <div className="flex flex-1 items-center justify-center">
              <div className="max-w-md px-8 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-scai-brand1/20 bg-gradient-to-br from-scai-brand1/20 to-scai-brand1/5">
                  <Layers className="h-10 w-10 text-scai-brand1" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">
                  Select a Component
                </h3>
                <p className="text-scai-text-sec">
                  Choose a component from the list on the left to preview its
                  variations and view the HTML/CSS code.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

/**
 * Component List Item
 */
function ComponentListItem({
  component,
  isSelected,
  variationCount,
  onClick,
}: {
  component: ComponentType;
  isSelected: boolean;
  variationCount: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ x: 2 }}
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 group ${
        isSelected
          ? "bg-scai-brand1/10 border border-scai-brand1/30"
          : "hover:bg-scai-surface border border-transparent"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isSelected
            ? "bg-scai-brand1 text-scai-page"
            : "bg-scai-surface text-scai-text-muted group-hover:bg-scai-brand1/10 group-hover:text-scai-brand1"
        }`}
      >
        <Box className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium truncate ${
              isSelected ? "text-scai-brand1" : "text-scai-text"
            }`}
          >
            {component.name}
          </span>
          {component.required && (
            <span className="rounded bg-scai-brand1/10 px-1.5 py-0.5 text-[10px] font-medium text-scai-brand1">
              Req
            </span>
          )}
        </div>
        <span className="text-xs text-scai-text-muted">
          {variationCount} variation{variationCount !== 1 ? "s" : ""}
        </span>
      </div>
      <ChevronRight
        className={`w-4 h-4 flex-shrink-0 transition-transform ${
          isSelected ? "text-scai-brand1" : "text-scai-text-muted"
        }`}
      />
    </motion.button>
  );
}
