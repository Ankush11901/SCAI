"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition } from "@/components/ui/PageTransition";
import {
  Book,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Check,
  X,
  AlertTriangle,
  Info,
  Sparkles,
  Filter,
} from "lucide-react";
import {
  ALL_CATEGORIES,
  getStats,
  type SubSection,
  type RuleItem,
  type Enforcement,
} from "@/data/guidelines";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/Dropdown";

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function EnforcementBadge({ enforcement }: { enforcement: Enforcement }) {
  const styles = {
    mandatory: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    recommended: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    forbidden: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const icons = {
    mandatory: <Check className="h-3 w-3" />,
    recommended: <Info className="h-3 w-3" />,
    forbidden: <X className="h-3 w-3" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${styles[enforcement]}`}
    >
      {icons[enforcement]}
      {enforcement}
    </span>
  );
}

function TypeBadge({ type }: { type: "rule" | "guideline" }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
        type === "rule"
          ? "bg-zinc-700/50 text-zinc-300 border border-zinc-600/50"
          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
      }`}
    >
      {type}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function RuleCard({
  item,
  isCompact = false,
}: {
  item: RuleItem;
  isCompact?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasExamples =
    item.examples && (item.examples.good?.length || item.examples.bad?.length);

  if (isCompact) {
    return (
      <div className="group rounded-xl border border-scai-border bg-scai-page p-4 transition-all duration-200 hover:border-scai-border-hover hover:bg-scai-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <h4 className="truncate text-sm font-medium text-scai-text">
                {item.title}
              </h4>
              <EnforcementBadge enforcement={item.enforcement} />
            </div>
            <p className="line-clamp-2 text-xs text-scai-text-sec">
              {item.description}
            </p>
          </div>
          {item.value && (
            <div className="flex-shrink-0 rounded-lg border border-scai-border bg-scai-card px-2.5 py-1">
              <span className="font-mono text-xs text-scai-text">
                {item.value}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="group overflow-hidden rounded-xl border border-scai-border bg-scai-page transition-colors duration-200 hover:border-scai-border-hover"
    >
      <div
        className={`p-4 ${hasExamples ? "cursor-pointer" : ""}`}
        onClick={() => hasExamples && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-medium text-scai-text">
                {item.title}
              </h4>
              <div className="flex items-center gap-1.5">
                <TypeBadge type={item.type} />
                <EnforcementBadge enforcement={item.enforcement} />
              </div>
            </div>
            <p className="text-sm leading-relaxed text-scai-text-sec">
              {item.description}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {item.value && (
              <div className="rounded-lg border border-scai-border bg-scai-card px-3 py-1.5">
                <span className="font-mono text-xs text-emerald-400">
                  {item.value}
                </span>
              </div>
            )}
            {hasExamples && (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-scai-card"
              >
                <ChevronDown className="h-4 w-4 text-scai-text-sec" />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {hasExamples && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-scai-border px-4 pb-4 pt-0">
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {item.examples?.good && item.examples.good.length > 0 && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                        Good
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {item.examples.good.map((ex, i) => (
                        <li
                          key={i}
                          className="relative pl-4 text-xs text-scai-text before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-emerald-500/50"
                        >
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.examples?.bad && item.examples.bad.length > 0 && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                    <div className="mb-2 flex items-center gap-1.5">
                      <X className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-xs font-medium uppercase tracking-wider text-red-400">
                        Avoid
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {item.examples.bad.map((ex, i) => (
                        <li
                          key={i}
                          className="relative pl-4 text-xs text-scai-text before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-red-500/50"
                        >
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSECTION ACCORDION
// ═══════════════════════════════════════════════════════════════════════════════

function SubSectionAccordion({
  subsection,
  isOpen,
  onToggle,
}: {
  subsection: SubSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = subsection.icon;

  return (
    <div className="overflow-hidden rounded-xl border border-scai-border bg-scai-page">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 transition-colors hover:bg-scai-card"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scai-card">
            <Icon className="h-4 w-4 text-scai-text-sec" />
          </div>
          <span className="text-sm font-medium text-scai-text">
            {subsection.title}
          </span>
          <span className="rounded-full bg-scai-card px-2 py-0.5 text-xs text-scai-text-sec">
            {subsection.items.length}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-4 w-4 text-scai-text-sec" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 p-4 pt-0">
              {subsection.items.map((item) => (
                <RuleCard key={item.id} item={item} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH RESULTS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function SearchResultsView({
  items,
  query,
}: {
  items: RuleItem[];
  query: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-scai-card">
          <Search className="h-8 w-8 text-scai-text-sec" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-scai-text">
          No results found
        </h3>
        <p className="max-w-md text-sm text-scai-text-sec">
          No rules or guidelines match &quot;{query}&quot;. Try a different
          search term.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mb-4 flex items-center gap-2 text-sm text-scai-text-sec">
        <Sparkles className="h-4 w-4" />
        <span>
          Found {items.length} matching {items.length === 1 ? "rule" : "rules"}
        </span>
      </div>
      {items.map((item) => (
        <RuleCard key={item.id} item={item} isCompact />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE - CLIENT COMPONENT (TWO-GRID LAYOUT)
// ═══════════════════════════════════════════════════════════════════════════════

export default function GuidelinesClient() {
  const [activeCategory, setActiveCategory] = useState<string>("golden-rules");
  const [searchQuery, setSearchQuery] = useState("");
  const [enforcementFilter, setEnforcementFilter] = useState<
    Enforcement | "all"
  >("all");
  const [expandAll, setExpandAll] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    // Start with first section open
    const initial = new Set<string>();
    if (ALL_CATEGORIES[0]?.subsections[0]) {
      initial.add(ALL_CATEGORIES[0].subsections[0].id);
    }
    return initial;
  });

  const stats = useMemo(() => getStats(), []);

  // Filter logic
  const filteredResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query && enforcementFilter === "all") return null;

    const results: RuleItem[] = [];

    ALL_CATEGORIES.forEach((category) => {
      category.subsections.forEach((subsection) => {
        subsection.items.forEach((item) => {
          const matchesQuery =
            !query ||
            item.title.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.value?.toLowerCase().includes(query);

          const matchesEnforcement =
            enforcementFilter === "all" ||
            item.enforcement === enforcementFilter;

          if (matchesQuery && matchesEnforcement) {
            results.push(item);
          }
        });
      });
    });

    return results;
  }, [searchQuery, enforcementFilter]);

  const activeTab = useMemo(
    () =>
      ALL_CATEGORIES.find((c) => c.id === activeCategory) || ALL_CATEGORIES[0],
    [activeCategory],
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setEnforcementFilter("all");
  }, []);

  const isFiltering = searchQuery.trim() !== "" || enforcementFilter !== "all";

  const ActiveIcon = activeTab.icon;

  return (
    <PageTransition>
      {/* Two-Grid Layout Container */}
      <div className="flex h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] flex-col gap-6 lg:flex-row">
        {/* LEFT PANEL - Categories & Search */}
        <div className="flex max-h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-xl border border-scai-border bg-scai-card lg:w-[380px]">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-scai-border p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
                <Book className="h-4 w-4 text-scai-page" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-scai-text">Guidelines</h1>
                <p className="text-xs text-scai-text-sec">Rules & Standards</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-shrink-0 border-b border-scai-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-scai-text-sec" />
              <input
                type="text"
                placeholder="Search rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-scai-border bg-scai-page py-2.5 pl-10 pr-4 text-sm text-scai-text placeholder:text-scai-text-sec focus:border-scai-brand1 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-scai-card transition-colors hover:bg-scai-border"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3 text-scai-text-sec" />
                </button>
              )}
            </div>

            {/* Filter dropdown */}
            <div className="mt-3 flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex flex-1 items-center justify-between gap-2 rounded-lg border border-scai-border bg-scai-page px-3 py-2 text-sm text-scai-text transition-all hover:bg-scai-card focus:border-scai-brand1 focus:outline-none"
                    aria-label="Filter by enforcement type"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-scai-text-sec" />
                      <span className="capitalize">
                        {enforcementFilter === "all"
                          ? "All Types"
                          : enforcementFilter}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-scai-text-sec" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={enforcementFilter}
                    onValueChange={(value) =>
                      setEnforcementFilter(value as Enforcement | "all")
                    }
                  >
                    <DropdownMenuRadioItem value="all">
                      All Types
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="mandatory">
                      <span className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-emerald-400" />
                        Mandatory
                      </span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="recommended">
                      <span className="flex items-center gap-2">
                        <Info className="h-3 w-3 text-blue-400" />
                        Recommended
                      </span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="forbidden">
                      <span className="flex items-center gap-2">
                        <X className="h-3 w-3 text-red-400" />
                        Forbidden
                      </span>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {isFiltering && (
                <button
                  onClick={handleClearFilters}
                  className="rounded-lg px-3 py-2 text-sm text-scai-text-sec transition-colors hover:text-scai-text"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Categories List - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {ALL_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                const itemCount = category.subsections.reduce(
                  (a, s) => a + s.items.length,
                  0,
                );

                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setActiveCategory(category.id);
                      // Reset expand state and open first section of new category
                      setExpandAll(false);
                      const firstSection = category.subsections[0];
                      setOpenSections(
                        new Set(firstSection ? [firstSection.id] : []),
                      );
                    }}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? `${category.bgColor} ${category.color}`
                        : "text-scai-text-sec hover:bg-scai-page hover:text-scai-text"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate text-sm font-medium">
                      {category.title}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs ${
                        isActive ? "bg-white/10" : "bg-scai-page"
                      }`}
                    >
                      {itemCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats Footer */}
          <div className="flex-shrink-0 border-t border-scai-border p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-scai-page p-2">
                <div className="text-lg font-bold text-emerald-400">
                  {stats.totalRules}
                </div>
                <div className="text-xs text-scai-text-sec">Rules</div>
              </div>
              <div className="rounded-lg bg-scai-page p-2">
                <div className="text-lg font-bold text-blue-400">
                  {stats.totalGuidelines}
                </div>
                <div className="text-xs text-scai-text-sec">Guidelines</div>
              </div>
              <div className="rounded-lg bg-scai-page p-2">
                <div className="text-lg font-bold text-amber-400">
                  {stats.mandatory}
                </div>
                <div className="text-xs text-scai-text-sec">Mandatory</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Content Display */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-scai-border bg-scai-card">
          {/* Category Header */}
          <div className="flex-shrink-0 border-b border-scai-border p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${activeTab.bgColor}`}
                >
                  <ActiveIcon className={`h-5 w-5 ${activeTab.color}`} />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${activeTab.color}`}>
                    {activeTab.title}
                  </h2>
                  <p className="text-sm text-scai-text-sec">
                    {activeTab.description}
                  </p>
                </div>
              </div>
              {!isFiltering && (
                <button
                  onClick={() => {
                    if (expandAll) {
                      // Collapse all - only keep first section open
                      const firstSection = activeTab.subsections[0];
                      setOpenSections(
                        new Set(firstSection ? [firstSection.id] : []),
                      );
                    } else {
                      // Expand all sections in current category
                      setOpenSections(
                        new Set(activeTab.subsections.map((s) => s.id)),
                      );
                    }
                    setExpandAll(!expandAll);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-scai-border px-3 py-2 text-sm text-scai-text-sec transition-colors hover:bg-scai-page hover:text-scai-text"
                >
                  {expandAll ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {expandAll ? "Collapse All" : "Expand All"}
                </button>
              )}
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-5">
            {isFiltering ? (
              /* Search Results */
              <SearchResultsView
                items={filteredResults || []}
                query={searchQuery}
              />
            ) : (
              /* Subsections */
              <div className="space-y-4">
                {activeTab.subsections.map((subsection) => (
                  <SubSectionAccordion
                    key={subsection.id}
                    subsection={subsection}
                    isOpen={openSections.has(subsection.id)}
                    onToggle={() => {
                      setOpenSections((prev) => {
                        const next = new Set(prev);
                        if (next.has(subsection.id)) {
                          next.delete(subsection.id);
                        } else {
                          next.add(subsection.id);
                        }
                        return next;
                      });
                      // Reset expandAll state when manually toggling
                      setExpandAll(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
