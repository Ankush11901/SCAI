"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Layout,
  FileText,
  Boxes,
  Search,
  Play,
  Clock,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Trash2,
  History,
  Sparkles,
  Zap,
  Code,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { MentionTextarea, type MentionOption } from "@/components/ui/MentionTextarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  type PromptCategory,
  type PromptDefinition,
  type ParamDefinition,
  CATEGORY_INFO,
} from "@/lib/prompts/registry";
import {
  getMockData,
  extractParamsFromMockData,
  getAvailableMockTypes,
} from "@/lib/prompts/mock-data";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type AIProvider = "gemini" | "openai" | "claude";

// Single iteration result
interface IterationResult {
  success: boolean;
  output: {
    raw: string;
    parsed: unknown;
    tokens: { input: number; output: number };
    duration: number;
  };
  error: string | null;
  historyId: string | null;
}

// Batch result with multiple iterations
interface BatchResult {
  success: boolean;
  iterations: number;
  batchId: string | null;
  aggregate: {
    avgDuration: number;
    totalDuration: number;
    avgTokens: { input: number; output: number };
    totalTokens: { input: number; output: number };
    successCount: number;
    failureCount: number;
  };
  results: IterationResult[];
  prompt: {
    system: string;
    user: string;
    rendered: string;
  };
  provider: AIProvider;
  model: string;
}

interface HistoryEntry {
  id: string;
  promptId: string;
  promptName: string;
  category: string;
  provider: string;
  model: string;
  params: Record<string, unknown>;
  tokens: { input: number; output: number } | null;
  duration: number | null;
  error: string | null;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const PROVIDERS: { id: AIProvider; name: string; color: string }[] = [
  { id: "gemini", name: "Gemini", color: "from-blue-500 to-cyan-500" },
  { id: "openai", name: "OpenAI", color: "from-green-500 to-emerald-500" },
  { id: "claude", name: "Claude", color: "from-orange-500 to-amber-500" },
];

const CATEGORY_ICONS: Record<PromptCategory, React.ReactNode> = {
  structure: <Layout className="h-4 w-4" />,
  content: <FileText className="h-4 w-4" />,
  component: <Boxes className="h-4 w-4" />,
  keyword: <Search className="h-4 w-4" />,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function PromptsClient() {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────

  // Prompts data
  const [prompts, setPrompts] = useState<Record<PromptCategory, PromptDefinition[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory>("structure");
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Parameters & editing
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [promptOverride, setPromptOverride] = useState<string>("");
  const [useOverride, setUseOverride] = useState(false);

  // Testing
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("gemini");
  const [isRunning, setIsRunning] = useState(false);
  const [runningProviders, setRunningProviders] = useState<Record<AIProvider, boolean>>({
    gemini: false,
    openai: false,
    claude: false,
  });
  const [iterations, setIterations] = useState<number>(1);
  const [runningIteration, setRunningIteration] = useState<number>(0);
  const [results, setResults] = useState<Record<AIProvider, BatchResult | null>>({
    gemini: null,
    openai: null,
    claude: null,
  });
  const [expandedRuns, setExpandedRuns] = useState<Record<string, boolean>>({});

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // UI
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"output" | "prompt">("output");

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────────

  // Fetch prompts on mount
  useEffect(() => {
    async function fetchPrompts() {
      try {
        const res = await fetch("/api/prompts");
        const data = await res.json();
        if (data.success) {
          setPrompts(data.data.prompts);
        } else {
          setError(data.error || "Failed to fetch prompts");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch prompts");
      } finally {
        setLoading(false);
      }
    }
    fetchPrompts();
  }, []);

  // Fetch history
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/prompts/history?limit=20");
        const data = await res.json();
        if (data.success) {
          setHistory(data.data.entries);
        }
      } catch {
        // Silently fail for history
      }
    }
    fetchHistory();
  }, [results]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────────────────────

  const categoryPrompts = useMemo(() => {
    if (!prompts) return [];
    return prompts[selectedCategory] || [];
  }, [prompts, selectedCategory]);

  const filteredPrompts = useMemo(() => {
    if (!searchQuery.trim()) return categoryPrompts;
    const q = searchQuery.toLowerCase();
    return categoryPrompts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [categoryPrompts, searchQuery]);

  const selectedPrompt = useMemo(() => {
    if (!selectedPromptId || !prompts) return null;
    const allPrompts = Object.values(prompts).flat();
    return allPrompts.find((p) => p.id === selectedPromptId) || null;
  }, [selectedPromptId, prompts]);

  // Filter available prefill types based on prompt's articleTypes
  const availablePrefillTypes = useMemo(() => {
    const allTypes = getAvailableMockTypes();
    if (!selectedPrompt?.articleTypes || selectedPrompt.articleTypes.length === 0) {
      // General prompt - show all types
      return allTypes;
    }
    // Filter to only show compatible types
    return allTypes.filter((type) => selectedPrompt.articleTypes!.includes(type));
  }, [selectedPrompt]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSelectPrompt = useCallback((prompt: PromptDefinition) => {
    setSelectedPromptId(prompt.id);
    // Initialize params with defaults
    const initialParams: Record<string, unknown> = {};
    for (const param of prompt.params) {
      if (param.default !== undefined) {
        initialParams[param.name] = param.default;
      }
    }
    setParams(initialParams);
    setPromptOverride("");
    setUseOverride(false);
    setResults({ gemini: null, openai: null, claude: null });
    setExpandedRuns({});
  }, []);

  const handleParamChange = useCallback((name: string, value: unknown) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handlePrefillParams = useCallback((mockType: string) => {
    if (!selectedPrompt) return;
    const mockData = getMockData(mockType);
    if (!mockData) return;

    const mockParams = extractParamsFromMockData(mockData, selectedPrompt.id);
    setParams(mockParams);
  }, [selectedPrompt]);

  const handleClearParams = useCallback(() => {
    if (!selectedPrompt) return;
    // Reset to defaults only
    const initialParams: Record<string, unknown> = {};
    for (const param of selectedPrompt.params) {
      if (param.default !== undefined) {
        initialParams[param.name] = param.default;
      }
    }
    setParams(initialParams);
  }, [selectedPrompt]);

  const handleRunTest = useCallback(async (provider: AIProvider) => {
    if (!selectedPrompt) return;

    setIsRunning(true);
    setSelectedProvider(provider);
    setRunningProviders((prev) => ({ ...prev, [provider]: true }));
    setRunningIteration(0);

    try {
      const res = await fetch("/api/prompts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: selectedPrompt.id,
          params,
          provider,
          overridePrompt: useOverride ? promptOverride : undefined,
          saveToHistory: true,
          iterations,
        }),
      });

      const data = await res.json();
      setResults((prev) => ({
        ...prev,
        [provider]: data,
      }));
      // Expand first run by default
      if (data.results?.length > 0) {
        setExpandedRuns((prev) => ({ ...prev, [`${provider}-0`]: true }));
      }
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [provider]: {
          success: false,
          iterations: 1,
          batchId: null,
          aggregate: {
            avgDuration: 0,
            totalDuration: 0,
            avgTokens: { input: 0, output: 0 },
            totalTokens: { input: 0, output: 0 },
            successCount: 0,
            failureCount: 1,
          },
          results: [{
            success: false,
            output: { raw: "", parsed: null, tokens: { input: 0, output: 0 }, duration: 0 },
            error: e instanceof Error ? e.message : "Unknown error",
            historyId: null,
          }],
          prompt: { system: "", user: "", rendered: "" },
          provider,
          model: "",
        },
      }));
    } finally {
      // Clear this provider's running state and check if all done
      setRunningProviders((prev) => {
        const updated = { ...prev, [provider]: false };
        // Check if any providers are still running
        const anyRunning = Object.values(updated).some(Boolean);
        if (!anyRunning) {
          setIsRunning(false);
        }
        return updated;
      });
      setRunningIteration(0);
    }
  }, [selectedPrompt, params, useOverride, promptOverride, iterations]);

  const handleRunAll = useCallback(async () => {
    if (!selectedPrompt) return;

    setIsRunning(true);
    // Set all providers as running
    setRunningProviders({ gemini: true, openai: true, claude: true });

    // Run all providers in parallel
    const promises = PROVIDERS.map((p) => handleRunTest(p.id));
    await Promise.all(promises);

    // Individual handlers will clear their own running state
    // and the last one to finish will clear isRunning
  }, [selectedPrompt, handleRunTest]);

  const handleCopy = useCallback(async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  }, []);

  const handleDeleteHistory = useCallback(async (id: string) => {
    try {
      await fetch(`/api/prompts/history/${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch {
      // Silently fail
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const renderParamInput = (param: ParamDefinition) => {
    const value = params[param.name];

    if (param.type === "select" && param.options) {
      return (
        <Select
          value={String(value || "")}
          onValueChange={(v) => handleParamChange(param.name, v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${param.name}`} />
          </SelectTrigger>
          <SelectContent>
            {param.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (param.type === "number") {
      return (
        <Input
          type="number"
          value={String(value || "")}
          onChange={(e) => handleParamChange(param.name, parseInt(e.target.value, 10) || 0)}
          placeholder={param.description}
        />
      );
    }

    if (param.type === "array") {
      return (
        <Textarea
          value={Array.isArray(value) ? value.join("\n") : String(value || "")}
          onChange={(e) => handleParamChange(param.name, e.target.value.split("\n").filter(Boolean))}
          placeholder="One item per line"
          rows={3}
        />
      );
    }

    if (param.type === "boolean") {
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => handleParamChange(param.name, e.target.checked)}
            className="h-4 w-4 rounded border-scai-border text-scai-brand1 focus:ring-scai-brand1/20"
          />
          <span className="text-sm text-scai-text-sec">{param.description}</span>
        </div>
      );
    }

    // Default: string or object (as JSON)
    if (param.type === "object") {
      return (
        <Textarea
          value={typeof value === "object" ? JSON.stringify(value, null, 2) : String(value || "")}
          onChange={(e) => {
            try {
              handleParamChange(param.name, JSON.parse(e.target.value));
            } catch {
              // Keep as string if invalid JSON
            }
          }}
          placeholder="Enter JSON"
          rows={3}
        />
      );
    }

    return (
      <Input
        value={String(value || "")}
        onChange={(e) => handleParamChange(param.name, e.target.value)}
        placeholder={param.description}
      />
    );
  };

  const toggleRunExpanded = useCallback((key: string) => {
    setExpandedRuns((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const renderResult = (provider: AIProvider) => {
    const result = results[provider];
    if (!result) {
      return (
        <div className="flex h-full items-center justify-center text-scai-text-muted">
          <p>Run a test to see results</p>
        </div>
      );
    }

    // Check if all iterations failed
    const allFailed = result.aggregate.successCount === 0;
    if (allFailed && result.results[0]?.error) {
      return (
        <div className="rounded-lg border border-error/30 bg-error/5 p-4">
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">All {result.iterations} runs failed</span>
          </div>
          <p className="mt-2 text-sm text-scai-text-sec">{result.results[0].error}</p>
        </div>
      );
    }

    return (
      <div className="h-full overflow-auto space-y-4">
        {/* Aggregate Stats */}
        <div className="rounded-lg border border-scai-border bg-scai-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">
              {result.iterations} {result.iterations === 1 ? "Run" : "Runs"}
            </h4>
            <span className={`text-sm font-medium ${
              result.aggregate.failureCount === 0
                ? "text-green-500"
                : result.aggregate.successCount === 0
                  ? "text-error"
                  : "text-amber-500"
            }`}>
              {result.aggregate.successCount}/{result.iterations} successful
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="rounded-lg bg-scai-surface px-3 py-1.5">
              <span className="text-scai-text-muted">Avg Time:</span>{" "}
              <span className="font-medium">{(result.aggregate.avgDuration / 1000).toFixed(2)}s</span>
            </div>
            <div className="rounded-lg bg-scai-surface px-3 py-1.5">
              <span className="text-scai-text-muted">Avg Tokens:</span>{" "}
              <span className="font-medium">
                {result.aggregate.avgTokens.input} + {result.aggregate.avgTokens.output}
              </span>
            </div>
            <div className="rounded-lg bg-scai-surface px-3 py-1.5">
              <span className="text-scai-text-muted">Total:</span>{" "}
              <span className="font-medium">{(result.aggregate.totalDuration / 1000).toFixed(2)}s</span>
            </div>
            <div className="rounded-lg bg-scai-surface px-3 py-1.5">
              <span className="text-scai-text-muted">Model:</span>{" "}
              <span className="font-medium">{result.model}</span>
            </div>
          </div>
        </div>

        {/* Individual Runs */}
        <div className="space-y-2">
          {result.results.map((run, index) => {
            const key = `${provider}-${index}`;
            const isExpanded = expandedRuns[key] ?? false;

            return (
              <div key={index} className="rounded-lg border border-scai-border bg-scai-card overflow-hidden">
                {/* Run Header */}
                <button
                  onClick={() => toggleRunExpanded(key)}
                  className="w-full flex items-center justify-between p-3 hover:bg-scai-surface transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-scai-text-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-scai-text-muted" />
                    )}
                    <span className="font-medium text-sm">Run {index + 1}</span>
                    <span className={`h-2 w-2 rounded-full ${
                      run.success ? "bg-green-500" : "bg-error"
                    }`} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-scai-text-muted">
                    <span>{(run.output.duration / 1000).toFixed(2)}s</span>
                    <span>{run.output.tokens.input + run.output.tokens.output} tokens</span>
                  </div>
                </button>

                {/* Run Content */}
                {isExpanded && (
                  <div className="border-t border-scai-border p-3">
                    {run.error ? (
                      <div className="rounded-lg bg-error/5 border border-error/30 p-3">
                        <p className="text-sm text-error">{run.error}</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-2 z-10"
                          onClick={() => handleCopy(run.output.raw, `${provider}-${index}-output`)}
                        >
                          {copiedText === `${provider}-${index}-output` ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <pre className="max-h-[300px] overflow-auto rounded-lg bg-[#1e1e1e] p-4 text-xs text-[#d4d4d4]">
                          <code>
                            {run.output.parsed
                              ? JSON.stringify(run.output.parsed, null, 2)
                              : run.output.raw}
                          </code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Loading & Error States
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-scai-brand1" />
      </div>
    );
  }

  if (error || !prompts) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-error" />
        <p className="text-lg font-medium text-error">{error || "Failed to load prompts"}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] flex-col gap-6 lg:flex-row">
      {/* ═══════════════════════════════════════════════════════════════════════════
          LEFT PANEL - Prompt Selection & Configuration
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="flex max-h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-xl border border-scai-border bg-scai-card lg:w-[420px]">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-scai-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-0.5 text-lg font-bold">Prompt Testing</h1>
              <p className="text-sm text-scai-text-sec">
                Test and compare AI prompts
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className={showHistory ? "text-scai-brand1" : ""}
            >
              <History className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {showHistory ? (
          /* History Panel */
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium">Recent Tests</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-scai-text-muted">No test history yet</p>
            ) : (
              <div className="space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="group rounded-lg border border-scai-border bg-scai-surface p-3 hover:border-scai-brand1/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{entry.promptName}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-scai-text-muted">
                          <span className="capitalize">{entry.provider}</span>
                          <span>·</span>
                          <span>{entry.duration ? `${(entry.duration / 1000).toFixed(1)}s` : "-"}</span>
                          <span>·</span>
                          <span>{new Date(entry.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => handleDeleteHistory(entry.id)}
                      >
                        <Trash2 className="h-4 w-4 text-error" />
                      </Button>
                    </div>
                    {entry.error && (
                      <p className="mt-1 truncate text-xs text-error">{entry.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Category Tabs */}
            <div className="flex-shrink-0 border-b border-scai-border p-3">
              <Tabs
                value={selectedCategory}
                onValueChange={(v) => {
                  setSelectedCategory(v as PromptCategory);
                  setSelectedPromptId(null);
                  setSearchQuery("");
                }}
              >
                <TabsList className="grid w-full grid-cols-4">
                  {(Object.keys(CATEGORY_INFO) as PromptCategory[]).map((cat) => (
                    <TabsTrigger key={cat} value={cat} className="gap-1 px-2 text-xs">
                      {CATEGORY_ICONS[cat]}
                      <span className="hidden sm:inline">{CATEGORY_INFO[cat].name}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Search */}
            <div className="flex-shrink-0 border-b border-scai-border p-3">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts..."
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            {/* Prompt List or Selected Prompt Config */}
            <div className="flex-1 overflow-y-auto">
              {selectedPrompt ? (
                /* Selected Prompt Configuration */
                <div className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPromptId(null)}
                    >
                      <ChevronRight className="mr-1 h-4 w-4 rotate-180" />
                      Back
                    </Button>
                    <span className="text-xs text-scai-text-muted">{selectedPrompt.id}</span>
                  </div>

                  <h3 className="text-lg font-bold">{selectedPrompt.name}</h3>
                  <p className="mt-1 text-sm text-scai-text-sec">{selectedPrompt.description}</p>

                  {/* Dependencies */}
                  {selectedPrompt.dependencies.length > 0 && (
                    <div className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
                      <span className="font-medium">Dependencies:</span>{" "}
                      {selectedPrompt.dependencies.join(", ")}
                    </div>
                  )}

                  {/* Parameters */}
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-sm font-medium">
                        <Zap className="h-4 w-4 text-scai-brand1" />
                        Parameters
                      </h4>
                      <div className="flex items-center gap-2">
                        {availablePrefillTypes.length === 1 ? (
                          // Single compatible type - show as button
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handlePrefillParams(availablePrefillTypes[0])}
                            className="h-7 text-xs capitalize"
                          >
                            Prefill ({availablePrefillTypes[0].replace("-", " ")})
                          </Button>
                        ) : (
                          // Multiple types - show dropdown
                          <Select onValueChange={handlePrefillParams}>
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue placeholder="Prefill..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availablePrefillTypes.map((type) => (
                                <SelectItem key={type} value={type} className="text-xs capitalize">
                                  {type.replace("-", " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearParams}
                          className="h-7 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    {selectedPrompt.params.map((param) => (
                      <div key={param.name}>
                        <label className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                          {param.name}
                          {param.required && <span className="text-error">*</span>}
                        </label>
                        {renderParamInput(param)}
                        <p className="mt-1 text-xs text-scai-text-muted">{param.description}</p>
                      </div>
                    ))}
                  </div>

                  {/* Prompt Override */}
                  <div className="mt-5">
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={useOverride}
                        onChange={(e) => setUseOverride(e.target.checked)}
                        className="h-4 w-4 rounded border-scai-border text-scai-brand1 focus:ring-scai-brand1/20"
                      />
                      Override Prompt
                    </label>
                    {useOverride && (
                      <MentionTextarea
                        value={promptOverride}
                        onChange={setPromptOverride}
                        mentions={selectedPrompt.params.map((p) => ({
                          id: p.name,
                          label: p.name,
                          description: p.description,
                        }))}
                        placeholder="Type @ to insert parameters..."
                        helperText="Use @ to reference parameters like {{topic}}"
                        className="mt-2 text-xs"
                      />
                    )}
                  </div>
                </div>
              ) : (
                /* Prompt List */
                <div className="space-y-1 p-3">
                  {filteredPrompts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-scai-text-muted">
                      No prompts found
                    </p>
                  ) : (
                    filteredPrompts.map((prompt) => (
                      <button
                        key={prompt.id}
                        onClick={() => handleSelectPrompt(prompt)}
                        className="w-full rounded-lg p-3 text-left transition-all hover:bg-scai-surface"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{prompt.name}</span>
                          <ChevronRight className="h-4 w-4 text-scai-text-muted" />
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-scai-text-muted">
                          {prompt.description}
                        </p>
                        {prompt.dependencies.length > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-amber-500">
                            <Clock className="h-3 w-3" />
                            <span>Has dependencies</span>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Run Buttons */}
            {selectedPrompt && (
              <div className="flex-shrink-0 border-t border-scai-border p-4">
                {/* Iterations Selector */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-scai-text-sec">Iterations per run:</span>
                  <Select
                    value={String(iterations)}
                    onValueChange={(v) => setIterations(parseInt(v, 10))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 run</SelectItem>
                      <SelectItem value="3">3 runs</SelectItem>
                      <SelectItem value="5">5 runs</SelectItem>
                      <SelectItem value="10">10 runs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  {PROVIDERS.map((p) => (
                    <Button
                      key={p.id}
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRunTest(p.id)}
                      disabled={isRunning}
                      className="relative overflow-hidden"
                    >
                      {runningProviders[p.id] ? (
                        <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-1 h-4 w-4" />
                      )}
                      {p.name}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleRunAll}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Run All Providers
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          RIGHT PANEL - Output & Comparison
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-scai-border bg-scai-card">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-scai-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-scai-input p-1">
              <button
                onClick={() => setViewMode("output")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  viewMode === "output"
                    ? "bg-scai-card text-scai-text shadow-sm"
                    : "text-scai-text-sec hover:text-scai-text"
                }`}
              >
                <Eye className="h-4 w-4" />
                Output
              </button>
              <button
                onClick={() => setViewMode("prompt")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  viewMode === "prompt"
                    ? "bg-scai-card text-scai-text shadow-sm"
                    : "text-scai-text-sec hover:text-scai-text"
                }`}
              >
                <Code className="h-4 w-4" />
                Prompt
              </button>
            </div>
          </div>

          {selectedPrompt && (
            <span className="text-sm text-scai-text-muted">
              {selectedPrompt.outputFormat === "json" ? "JSON Output" : "Text Output"}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-scai-surface p-4">
          {!selectedPrompt ? (
            <div className="flex h-full flex-col items-center justify-center text-scai-text-muted">
              <Boxes className="mb-4 h-12 w-12 opacity-50" />
              <p className="text-lg font-medium">Select a prompt to test</p>
              <p className="mt-1 text-sm">
                Choose from {Object.values(prompts).flat().length} prompts across 4 categories
              </p>
            </div>
          ) : viewMode === "prompt" ? (
            /* Prompt View */
            <div className="h-full overflow-auto">
              {results[selectedProvider]?.prompt ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-scai-text-muted">
                      System Prompt
                    </h4>
                    <pre className="max-h-[200px] overflow-auto rounded-lg bg-[#1e1e1e] p-4 text-xs text-[#d4d4d4]">
                      {results[selectedProvider]!.prompt.system}
                    </pre>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-medium text-scai-text-muted">User Prompt</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(results[selectedProvider]!.prompt.user, "user-prompt")
                        }
                      >
                        {copiedText === "user-prompt" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <pre className="max-h-[400px] overflow-auto rounded-lg bg-[#1e1e1e] p-4 text-xs text-[#d4d4d4]">
                      {results[selectedProvider]!.prompt.user}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-scai-text-muted">
                  <p>Run a test to see the prompt</p>
                </div>
              )}
            </div>
          ) : (
            /* Output View - Provider Tabs */
            <Tabs
              value={selectedProvider}
              onValueChange={(v) => setSelectedProvider(v as AIProvider)}
              className="h-full"
            >
              <TabsList className="mb-4">
                {PROVIDERS.map((p) => (
                  <TabsTrigger key={p.id} value={p.id} className="relative">
                    {p.name}
                    {results[p.id]?.success !== undefined && (
                      <span
                        className={`ml-2 h-2 w-2 rounded-full ${
                          results[p.id]?.success ? "bg-green-500" : "bg-error"
                        }`}
                      />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {PROVIDERS.map((p) => (
                <TabsContent key={p.id} value={p.id} className="mt-0 h-[calc(100%-60px)]">
                  {renderResult(p.id)}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
