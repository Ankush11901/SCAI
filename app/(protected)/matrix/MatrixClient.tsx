"use client";

import { useState, useEffect, useMemo } from "react";
import { ARTICLE_TYPES } from "@/data/article-types";
import { UNIVERSAL_COMPONENTS, UNIQUE_COMPONENTS } from "@/data/components";
import { STRUCTURE_FLOWS } from "@/data/structure-flows";
import { COMPONENT_VARIATIONS } from "@/data/variations";
import {
  getArticleTypeDefaults,
  getTone,
  getStyle,
  GLOBAL_WORD_COUNT,
  CONTENT_TIERS,
} from "@/data/tone-style";
import {
  Grid3X3,
  CheckCircle,
  XCircle,
  Layers,
  ImageIcon,
  FileText,
  List,
  Search,
  X,
  Eye,
  ArrowUpDown,
  Filter,
  Volume2,
  PenTool,
  Hash,
} from "lucide-react";
import { PageTransition } from "@/components/ui/PageTransition";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

type ViewMode = "matrix" | "flows";
type SortField = "name" | "type" | "required";
type SortDirection = "asc" | "desc";

/**
 * Component Matrix Page - Client Component
 * View the relationship between article types and components
 */
export default function MatrixClient() {
  const [viewMode, setViewMode] = useState<ViewMode>("matrix");
  const [selectedArticleType, setSelectedArticleType] =
    useState<string>("affiliate");

  return (
    <PageTransition className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-8 py-6 border-b border-scai-border bg-scai-page">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Grid3X3 className="w-5 h-5 text-scai-page" />
              </div>
              <h1 className="text-2xl font-bold">Component Matrix</h1>
            </div>
            <p className="text-scai-text-sec max-w-2xl">
              View the relationship between article types and their
              required/optional components. Explore structure blueprints to
              understand article composition.
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex bg-scai-input rounded-lg p-1">
            <button
              onClick={() => setViewMode("matrix")}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                viewMode === "matrix"
                  ? "bg-scai-brand1 text-scai-page"
                  : "text-scai-text-sec hover:text-scai-text"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Matrix View
            </button>
            <button
              onClick={() => setViewMode("flows")}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                viewMode === "flows"
                  ? "bg-scai-brand1 text-scai-page"
                  : "text-scai-text-sec hover:text-scai-text"
              }`}
            >
              <Layers className="w-4 h-4" />
              Structure Blueprint
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {viewMode === "matrix" ? (
          <MatrixView />
        ) : (
          <StructureBlueprintView
            selectedType={selectedArticleType}
            onSelectType={setSelectedArticleType}
          />
        )}
      </div>
    </PageTransition>
  );
}

function MatrixView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedComponent, setSelectedComponent] = useState<
    (typeof UNIVERSAL_COMPONENTS)[0] | null
  >(null);

  const allComponents = [...UNIVERSAL_COMPONENTS, ...UNIQUE_COMPONENTS];

  const isComponentUsed = (
    componentId: string,
    articleTypeId: string,
  ): boolean | "optional" => {
    const component = allComponents.find((c) => c.id === componentId);
    if (!component) return false;

    // Universal components are used in all article types
    if (UNIVERSAL_COMPONENTS.find((c) => c.id === componentId)) {
      return component.required ? true : "optional";
    }

    // Unique components - check if they're for this article type
    const uniqueComponent = UNIQUE_COMPONENTS.find((c) => c.id === componentId);
    if (uniqueComponent?.articleTypes?.includes(articleTypeId)) {
      return uniqueComponent.required ? true : "optional";
    }

    return false;
  };

  // Filter and sort components
  const filteredComponents = useMemo(() => {
    let components = allComponents;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      components = components.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query),
      );
    }

    // Type filter
    if (filterType !== "all") {
      if (filterType === "universal") {
        components = components.filter((c) =>
          UNIVERSAL_COMPONENTS.some((uc) => uc.id === c.id),
        );
      } else if (filterType === "unique") {
        components = components.filter((c) =>
          UNIQUE_COMPONENTS.some((uc) => uc.id === c.id),
        );
      } else if (filterType === "required") {
        components = components.filter((c) => c.required);
      } else if (filterType === "optional") {
        components = components.filter((c) => !c.required);
      }
    }

    // Sort
    components = [...components].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "type":
          const aIsUniversal = UNIVERSAL_COMPONENTS.some(
            (uc) => uc.id === a.id,
          );
          const bIsUniversal = UNIVERSAL_COMPONENTS.some(
            (uc) => uc.id === b.id,
          );
          comparison =
            aIsUniversal === bIsUniversal ? 0 : aIsUniversal ? -1 : 1;
          break;
        case "required":
          comparison = a.required === b.required ? 0 : a.required ? -1 : 1;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return components;
  }, [searchQuery, filterType, sortField, sortDirection, allComponents]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-scai-text-muted" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-scai-input border border-scai-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-scai-brand1/50 focus:border-scai-brand1"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-scai-surface rounded"
              title="Clear search"
            >
              <X className="w-3 h-3 text-scai-text-muted" />
            </button>
          )}
        </div>

        {/* Filter */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Components</SelectItem>
            <SelectItem value="universal">Universal Only</SelectItem>
            <SelectItem value="unique">Unique Only</SelectItem>
            <SelectItem value="required">Required Only</SelectItem>
            <SelectItem value="optional">Optional Only</SelectItem>
          </SelectContent>
        </Select>

        {/* Results count */}
        <div className="flex items-center text-sm text-scai-text-sec">
          {filteredComponents.length} of {allComponents.length} components
        </div>
      </div>

      <div className="bg-scai-card border border-scai-border rounded-2xl overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-320px)]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-scai-surface">
                <th className="text-left p-4 font-semibold text-sm border-b border-scai-border sticky left-0 bg-scai-surface z-20 min-w-[200px]">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-2 hover:text-scai-brand1 transition-colors"
                  >
                    Component
                    <ArrowUpDown
                      className={`w-3 h-3 ${sortField === "name" ? "text-scai-brand1" : "text-scai-text-muted"}`}
                    />
                  </button>
                </th>
                {ARTICLE_TYPES.map((type) => (
                  <th
                    key={type.id}
                    className="text-center p-4 font-semibold text-sm border-b border-scai-border min-w-[100px]"
                  >
                    <span className="block truncate">{type.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredComponents.map((component) => {
                const isUniversal = UNIVERSAL_COMPONENTS.some(
                  (c) => c.id === component.id,
                );
                const variations = COMPONENT_VARIATIONS[component.id] || [];

                return (
                  <tr
                    key={component.id}
                    className="hover:bg-scai-surface/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedComponent(component)}
                  >
                    <td className="p-4 border-b border-scai-border sticky left-0 bg-scai-card z-10 hover:bg-scai-surface/50">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {component.name}
                        </span>
                        {component.required && (
                          <span className="px-1.5 py-0.5 bg-scai-brand1/10 text-scai-brand1 text-xs rounded">
                            Req
                          </span>
                        )}
                        {!isUniversal && (
                          <span className="px-1.5 py-0.5 bg-scai-brand2/10 text-scai-brand2 text-xs rounded">
                            Unique
                          </span>
                        )}
                        {variations.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-scai-surface text-scai-text-muted text-xs rounded">
                            {variations.length}v
                          </span>
                        )}
                      </div>
                    </td>
                    {ARTICLE_TYPES.map((type) => {
                      const status = isComponentUsed(component.id, type.id);
                      return (
                        <td
                          key={type.id}
                          className="p-4 text-center border-b border-scai-border"
                        >
                          <StatusIcon status={status} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-6 py-4 bg-scai-surface border-t border-scai-border flex items-center gap-6 flex-wrap">
          <span className="text-sm text-scai-text-sec">Legend:</span>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-sm">Required</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-scai-brand2 bg-scai-brand2/20" />
            <span className="text-sm">Optional</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-scai-text-muted" />
            <span className="text-sm">Not Used</span>
          </div>
          <div className="ml-auto text-xs text-scai-text-muted">
            Click a row to view component details
          </div>
        </div>
      </div>

      {/* Component Detail Dialog */}
      <ComponentDetailDialog
        component={selectedComponent}
        open={!!selectedComponent}
        onOpenChange={(open) => !open && setSelectedComponent(null)}
      />
    </>
  );
}

function ComponentDetailDialog({
  component,
  open,
  onOpenChange,
}: {
  component: (typeof UNIVERSAL_COMPONENTS)[0] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!component) return null;

  const isUniversal = UNIVERSAL_COMPONENTS.some((c) => c.id === component.id);
  const variations = COMPONENT_VARIATIONS[component.id] || [];
  const uniqueComponent = UNIQUE_COMPONENTS.find((c) => c.id === component.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {component.name}
            {component.required && (
              <span className="px-2 py-0.5 bg-scai-brand1/10 text-scai-brand1 text-xs rounded">
                Required
              </span>
            )}
            {!isUniversal && (
              <span className="px-2 py-0.5 bg-scai-brand2/10 text-scai-brand2 text-xs rounded">
                Unique
              </span>
            )}
          </DialogTitle>
          <DialogDescription>{component.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Component Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-scai-surface rounded-lg p-4">
              <div className="text-xs text-scai-text-muted uppercase mb-1">
                Component ID
              </div>
              <code className="text-sm">{component.id}</code>
            </div>
            <div className="bg-scai-surface rounded-lg p-4">
              <div className="text-xs text-scai-text-muted uppercase mb-1">
                Type
              </div>
              <div className="text-sm">
                {isUniversal ? "Universal" : "Unique"}
              </div>
            </div>
          </div>

          {/* Constraints */}
          {(component.constraints.maxLength ||
            component.constraints.minLength ||
            component.constraints.wordCount) && (
            <div>
              <div className="text-sm font-medium mb-2">Constraints</div>
              <div className="grid grid-cols-2 gap-3">
                {component.constraints.maxLength && (
                  <div className="bg-scai-surface rounded-lg p-3">
                    <div className="text-xs text-scai-text-muted uppercase mb-1">
                      Max Characters
                    </div>
                    <div className="text-sm font-mono text-scai-brand1">
                      {component.constraints.maxLength} chars
                    </div>
                  </div>
                )}
                {component.constraints.minLength && (
                  <div className="bg-scai-surface rounded-lg p-3">
                    <div className="text-xs text-scai-text-muted uppercase mb-1">
                      Min Characters
                    </div>
                    <div className="text-sm font-mono text-scai-brand2">
                      {component.constraints.minLength} chars
                    </div>
                  </div>
                )}
                {component.constraints.wordCount && (
                  <div className="bg-scai-surface rounded-lg p-3 col-span-2">
                    <div className="text-xs text-scai-text-muted uppercase mb-1">
                      Word Count
                    </div>
                    <div className="text-sm font-mono">
                      {component.constraints.wordCount.min ===
                      component.constraints.wordCount.max ? (
                        <span className="text-scai-brand1">
                          {component.constraints.wordCount.min} words (fixed)
                        </span>
                      ) : (
                        <span>
                          <span className="text-scai-brand2">
                            {component.constraints.wordCount.min}
                          </span>{" "}
                          -{" "}
                          <span className="text-scai-brand1">
                            {component.constraints.wordCount.max}
                          </span>{" "}
                          words
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Article Types (for unique components) */}
          {uniqueComponent?.articleTypes && (
            <div>
              <div className="text-sm font-medium mb-2">
                Used In Article Types
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueComponent.articleTypes.map((typeId) => {
                  const type = ARTICLE_TYPES.find((t) => t.id === typeId);
                  return (
                    <span
                      key={typeId}
                      className="px-3 py-1 bg-scai-brand1/10 text-scai-brand1 text-sm rounded-full"
                    >
                      {type?.name || typeId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variations */}
          {variations.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">
                Variations ({variations.length})
              </div>
              <div className="space-y-2">
                {variations.map((variation, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-scai-surface rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-scai-brand1/10 text-scai-brand1 text-xs font-medium rounded">
                        {index + 1}
                      </span>
                      <span className="text-sm">{variation.name}</span>
                    </div>
                    <Eye className="w-4 h-4 text-scai-text-muted" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {variations.length === 0 && (
            <div className="text-center py-6 text-scai-text-muted">
              No variations defined for this component yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusIcon({ status }: { status: boolean | "optional" }) {
  if (status === true) {
    return <CheckCircle className="w-5 h-5 text-success mx-auto" />;
  }
  if (status === "optional") {
    return (
      <div className="w-5 h-5 rounded-full border-2 border-scai-brand2 bg-scai-brand2/20 mx-auto" />
    );
  }
  return <XCircle className="w-5 h-5 text-scai-text-muted mx-auto" />;
}

/**
 * Structure Blueprint View
 * Shows article structure as a visual representation like an actual article
 */
function StructureBlueprintView({
  selectedType,
  onSelectType,
}: {
  selectedType: string;
  onSelectType: (type: string) => void;
}) {
  const flow = STRUCTURE_FLOWS[selectedType] || [];
  const articleType = ARTICLE_TYPES.find((t) => t.id === selectedType);
  const [enabledComponents, setEnabledComponents] = useState<Set<string>>(
    new Set(flow),
  );
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Toggle component on/off
  const toggleComponent = (componentId: string) => {
    setEnabledComponents((prev) => {
      const next = new Set(prev);
      if (next.has(componentId)) {
        next.delete(componentId);
      } else {
        next.add(componentId);
      }
      return next;
    });
  };

  // Reset enabled components when article type changes
  useEffect(() => {
    setEnabledComponents(new Set(flow));
  }, [selectedType, flow]);

  return (
    <div className="flex gap-8">
      {/* Sidebar - Article Types with Inline Component Toggles */}
      <div className="w-72 flex-shrink-0">
        <h3 className="text-sm font-semibold text-scai-text-sec uppercase tracking-wide mb-4">
          Article Types
        </h3>
        <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
          {ARTICLE_TYPES.map((type) => {
            const isSelected = selectedType === type.id;
            const typeFlow = STRUCTURE_FLOWS[type.id] || [];

            return (
              <div key={type.id}>
                <button
                  onClick={() => onSelectType(type.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                    isSelected
                      ? "bg-gradient-primary text-scai-page font-semibold"
                      : "bg-scai-card border border-scai-border hover:border-scai-brand1/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{type.name}</div>
                    <span
                      className={`text-xs ${
                        isSelected
                          ? "text-scai-page/70"
                          : "text-scai-text-muted"
                      }`}
                    >
                      {enabledComponents.size}/{typeFlow.length}
                    </span>
                  </div>
                  <div
                    className={`text-xs ${
                      isSelected ? "text-scai-page/70" : "text-scai-text-muted"
                    }`}
                  >
                    {type.description}
                  </div>
                </button>

                {/* Inline Component Toggles - Only show for selected type */}
                {isSelected && (
                  <div className="mt-2 ml-2 pl-3 border-l-2 border-scai-brand1/30 space-y-1 pb-2">
                    {flow.map((componentId, index) => {
                      const component = [
                        ...UNIVERSAL_COMPONENTS,
                        ...UNIQUE_COMPONENTS,
                      ].find((c) => c.id === componentId);
                      const isEnabled = enabledComponents.has(componentId);
                      const isRequired = component?.required;
                      const isHovered =
                        hoveredComponent === componentId &&
                        hoveredIndex === index;
                      return (
                        <button
                          key={`${componentId}-${index}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isRequired) toggleComponent(componentId);
                          }}
                          onMouseEnter={() => {
                            setHoveredComponent(componentId);
                            setHoveredIndex(index);
                          }}
                          onMouseLeave={() => {
                            setHoveredComponent(null);
                            setHoveredIndex(null);
                          }}
                          disabled={isRequired}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-all ${
                            isHovered
                              ? "bg-scai-brand1 text-white"
                              : isEnabled
                                ? "bg-scai-brand1/10 text-scai-text"
                                : "bg-scai-surface text-scai-text-muted line-through"
                          } ${
                            isRequired
                              ? "opacity-75 cursor-default"
                              : "hover:bg-scai-brand1 hover:text-white cursor-pointer"
                          }`}
                        >
                          <span className="truncate">
                            {component?.name || componentId}
                          </span>
                          {isRequired ? (
                            <span
                              className={`text-[9px] px-1 py-0.5 rounded flex-shrink-0 ml-1 ${
                                isHovered
                                  ? "bg-white/20 text-white"
                                  : "bg-scai-brand1/20 text-scai-brand1"
                              }`}
                            >
                              REQ
                            </span>
                          ) : (
                            <span
                              className={`text-[9px] px-1 py-0.5 rounded flex-shrink-0 ml-1 ${
                                isHovered
                                  ? "bg-white/20 text-white"
                                  : isEnabled
                                    ? "bg-scai-brand2/20 text-scai-brand2"
                                    : "bg-gray-200 text-gray-500"
                              }`}
                            >
                              {isEnabled ? "ON" : "OFF"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Structure Blueprint - Main Area */}
      <div className="flex-1">
        <div className="bg-scai-card border border-scai-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-scai-border bg-scai-surface">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">
                  {articleType?.name} Article
                </h2>
                <p className="text-sm text-scai-text-sec">
                  {articleType?.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-scai-brand1/10 text-scai-brand1 text-xs font-medium rounded-full">
                  {flow.length} components
                </span>
              </div>
            </div>

            {/* Tone & Style Defaults */}
            {(() => {
              const defaults = getArticleTypeDefaults(selectedType);
              const tone = defaults ? getTone(defaults.tone) : null;
              const style = defaults ? getStyle(defaults.style) : null;

              return defaults ? (
                <div className="flex flex-wrap gap-3 pt-3 border-t border-scai-border">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-500/10 rounded-lg">
                    <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-xs text-scai-text-muted">Tone:</span>
                    <span className="text-xs font-medium text-pink-400">
                      {tone?.name}
                    </span>
                    <span className="text-sm">{tone?.icon}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg">
                    <PenTool className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs text-scai-text-muted">Style:</span>
                    <span className="text-xs font-medium text-purple-400">
                      {style?.name}
                    </span>
                    <span className="text-[10px] text-purple-300">
                      ({style?.wordsPerSentence} words/sentence)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-lg">
                    <Hash className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs text-scai-text-muted">
                      Word Range:
                    </span>
                    <span className="text-xs font-medium text-amber-400">
                      {GLOBAL_WORD_COUNT.min}-{GLOBAL_WORD_COUNT.max}
                    </span>
                  </div>
                </div>
              ) : null;
            })()}
          </div>

          {/* Blueprint - Article-like Layout */}
          <div className="p-8">
            <div className="max-w-2xl mx-auto">
              {/* Article simulation */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="p-8">
                  {flow
                    .map((componentId, index) => ({
                      componentId,
                      originalIndex: index,
                    }))
                    .filter(({ componentId }) =>
                      enabledComponents.has(componentId),
                    )
                    .map(({ componentId, originalIndex }) => (
                      <BlueprintComponent
                        key={`${componentId}-${originalIndex}`}
                        componentId={componentId}
                        index={originalIndex}
                        isUnique={
                          !!UNIQUE_COMPONENTS.find((c) => c.id === componentId)
                        }
                        isHighlighted={
                          hoveredComponent === componentId &&
                          hoveredIndex === originalIndex
                        }
                        onMouseEnter={() => {
                          setHoveredComponent(componentId);
                          setHoveredIndex(originalIndex);
                        }}
                        onMouseLeave={() => {
                          setHoveredComponent(null);
                          setHoveredIndex(null);
                        }}
                      />
                    ))}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-6 flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
                  <span className="text-scai-text-sec">
                    Universal Component
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-scai-brand1/10 border border-scai-brand1/30" />
                  <span className="text-scai-text-sec">Unique Component</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual component in the blueprint - styled to look like article elements
 */
function BlueprintComponent({
  componentId,
  index,
  isUnique,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
}: {
  componentId: string;
  index: number;
  isUnique: boolean;
  isHighlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const component = [...UNIVERSAL_COMPONENTS, ...UNIQUE_COMPONENTS].find(
    (c) => c.id === componentId,
  );
  const name = component?.name || componentId;

  // Highlight wrapper style
  const highlightStyle = isHighlighted
    ? "ring-2 ring-scai-brand1 ring-offset-2 rounded-lg bg-scai-brand1/5"
    : "";

  // Style based on component type
  const getComponentStyle = () => {
    switch (componentId) {
      case "h1":
        return (
          <div
            className={`mb-6 transition-all ${highlightStyle}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <div className="h-10 bg-gray-900 rounded-lg flex items-center px-4">
              <span className="text-white text-sm font-bold">
                H1 - Article Title
              </span>
            </div>
          </div>
        );

      case "featured-image":
        return (
          <div
            className={`mb-6 transition-all ${highlightStyle}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <div className="aspect-video bg-gray-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-xs text-gray-500 font-medium">
                FEATURED IMAGE
              </span>
            </div>
          </div>
        );

      case "paragraph":
        return (
          <div
            className={`mb-4 transition-all ${highlightStyle}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded w-full" />
              <div className="h-2 bg-gray-200 rounded w-11/12" />
              <div className="h-2 bg-gray-200 rounded w-4/5" />
            </div>
          </div>
        );

      case "toc":
        return (
          <div
            className={`mb-6 transition-all ${highlightStyle}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-bold text-gray-500 uppercase mb-3">
                Table of Contents
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">1.</span>
                  <div className="h-2 bg-gray-200 rounded w-3/4" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">2.</span>
                  <div className="h-2 bg-gray-200 rounded w-2/3" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">3.</span>
                  <div className="h-2 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          </div>
        );

      case "h2":
        return (
          <div
            className={`mt-8 mb-4 transition-all ${highlightStyle}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <div className="h-7 bg-gray-800 rounded flex items-center px-3 w-full">
              <span className="text-white text-xs font-semibold">
                H2 - Section Heading
              </span>
            </div>
          </div>
        );

      case "h2-image":
        return (
          <div
            className={`mb-4 transition-all ${highlightStyle}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <div className="aspect-[16/10] bg-gray-100 rounded border border-dashed border-gray-300 flex flex-col items-center justify-center">
              <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-[10px] text-gray-500">H2 IMAGE (OPT)</span>
            </div>
          </div>
        );

      case "faq":
        return (
          <div
            className={`mt-8 mb-4 transition-all ${highlightStyle}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-bold text-gray-700 mb-3">
                FAQ Section
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-2 bg-gray-300 rounded w-2/3" />
                    <div className="h-2 bg-gray-200 rounded w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "closing":
        return (
          <div
            className={`mt-8 pt-6 border-t-2 border-gray-200 transition-all ${highlightStyle}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <div className="h-6 bg-gray-700 rounded flex items-center px-3 w-1/2 mb-3">
              <span className="text-white text-xs">CLOSING (OPT)</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded w-full" />
              <div className="h-2 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        );

      default:
        // Unique components get special styling
        if (isUnique) {
          return (
            <div
              className={`mb-4 transition-all ${highlightStyle}`}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
            >
              <div
                className="p-4 rounded-lg border-2 border-dashed flex items-center justify-center"
                style={{
                  borderColor: "#40EDC3",
                  backgroundColor: "rgba(64, 237, 195, 0.05)",
                }}
              >
                <div className="text-center">
                  <List
                    className="w-5 h-5 mx-auto mb-1"
                    style={{ color: "#40EDC3" }}
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "#40EDC3" }}
                  >
                    {name.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          );
        }

        // Generic component
        return (
          <div
            className={`mb-4 transition-all ${highlightStyle}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <div className="p-3 bg-gray-50 border border-gray-200 rounded flex items-center">
              <FileText className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-xs text-gray-600">{name}</span>
            </div>
          </div>
        );
    }
  };

  return getComponentStyle();
}
