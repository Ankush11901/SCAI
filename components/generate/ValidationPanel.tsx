"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  RefreshCw,
  Lightbulb,
  Shield,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  validateArticle,
  getValidationSummary,
  getFixSuggestions,
  canExport,
  type ValidationResult,
  type RuleResult,
  type CategoryResult,
} from "@/lib/services/article-validator";

interface ValidationPanelProps {
  html: string;
  articleType: string;
  variation: string;
  keyword?: string;
  onRevalidate?: () => void;
  onExport?: () => void;
  className?: string;
}

/**
 * Validation Panel Component
 * Displays article validation results with expandable categories
 */
export function ValidationPanel({
  html,
  articleType,
  variation,
  keyword,
  onRevalidate,
  onExport,
  className = "",
}: ValidationPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Run validation
  const validationResult = useMemo(() => {
    if (!html) return null;
    return validateArticle(html, articleType, variation, keyword);
  }, [html, articleType, variation, keyword]);

  if (!validationResult) {
    return (
      <div
        className={`bg-scai-card border border-scai-border rounded-xl p-6 ${className}`}
      >
        <div className="flex items-center gap-3 text-scai-text-muted">
          <Info className="w-5 h-5" />
          <span>Generate content to see validation results</span>
        </div>
      </div>
    );
  }

  const summary = getValidationSummary(validationResult);
  const suggestions = getFixSuggestions(validationResult);
  const exportStatus = canExport(validationResult);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div
      className={`bg-scai-card border border-scai-border rounded-xl overflow-hidden ${className}`}
    >
      {/* Header with Score */}
      <div className="px-6 py-4 border-b border-scai-border bg-scai-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-scai-brand1" />
            <div>
              <h3 className="font-semibold">Content Validation</h3>
              <p className="text-sm text-scai-text-sec">{summary}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Score Badge */}
            <div
              className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                validationResult.score >= 80
                  ? "bg-success/10 text-success"
                  : validationResult.score >= 60
                  ? "bg-warning/10 text-warning"
                  : "bg-error/10 text-error"
              }`}
            >
              {validationResult.score}%
            </div>
            {onRevalidate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRevalidate}
                title="Re-validate"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-scai-text-muted mb-1">
            <span>
              {validationResult.totalPassed} / {validationResult.totalRules}{" "}
              rules passed
            </span>
            <span>{validationResult.warnings.length} warnings</span>
          </div>
          <div className="h-2 bg-scai-input rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${
                validationResult.score >= 80
                  ? "bg-success"
                  : validationResult.score >= 60
                  ? "bg-warning"
                  : "bg-error"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${validationResult.score}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Critical Issues Alert */}
      {validationResult.criticalIssues.length > 0 && (
        <div className="px-6 py-3 bg-error/10 border-b border-error/20">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-error">
                {validationResult.criticalIssues.length} Critical Issue
                {validationResult.criticalIssues.length > 1 ? "s" : ""}
              </p>
              <ul className="text-sm text-error/80 mt-1">
                {validationResult.criticalIssues.slice(0, 3).map((issue, i) => (
                  <li key={i}>• {issue.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Category Results */}
      <div className="divide-y divide-scai-border">
        {validationResult.categories.map((category) => (
          <CategorySection
            key={category.category}
            category={category}
            isExpanded={expandedCategories.has(category.category)}
            onToggle={() => toggleCategory(category.category)}
          />
        ))}
      </div>

      {/* Suggestions Panel */}
      {suggestions.length > 0 && (
        <div className="border-t border-scai-border">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-scai-surface transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium">
                {suggestions.length} Fix Suggestion
                {suggestions.length > 1 ? "s" : ""}
              </span>
            </div>
            {showSuggestions ? (
              <ChevronDown className="w-4 h-4 text-scai-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-scai-text-muted" />
            )}
          </button>
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4 space-y-2">
                  {suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="p-3 bg-warning/5 border border-warning/20 rounded-lg text-sm"
                    >
                      <p className="font-medium text-scai-text">{s.rule}</p>
                      <p className="text-scai-text-sec">{s.suggestion}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Export Button */}
      {onExport && (
        <div className="px-6 py-4 border-t border-scai-border bg-scai-surface">
          <Button
            variant={exportStatus.allowed ? "primary" : "secondary"}
            className="w-full"
            onClick={onExport}
            disabled={!exportStatus.allowed}
          >
            <Download className="w-4 h-4 mr-2" />
            {exportStatus.allowed ? "Export Article" : "Fix Issues to Export"}
          </Button>
          {!exportStatus.allowed && exportStatus.reason && (
            <p className="text-xs text-error mt-2 text-center">
              {exportStatus.reason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface CategorySectionProps {
  category: CategoryResult;
  isExpanded: boolean;
  onToggle: () => void;
}

function CategorySection({
  category,
  isExpanded,
  onToggle,
}: CategorySectionProps) {
  const allPassed = category.passed === category.total;
  const hasFails = category.rules.some((r) => r.status === "fail");

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-scai-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          {allPassed ? (
            <CheckCircle className="w-4 h-4 text-success" />
          ) : hasFails ? (
            <XCircle className="w-4 h-4 text-error" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-warning" />
          )}
          <span className="font-medium">{category.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm ${
              allPassed
                ? "text-success"
                : hasFails
                ? "text-error"
                : "text-warning"
            }`}
          >
            {category.passed}/{category.total}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-scai-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-scai-text-muted" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-4 space-y-2">
              {category.rules.map((rule) => (
                <RuleItem key={rule.id} rule={rule} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RuleItem({ rule }: { rule: RuleResult }) {
  return (
    <div
      className={`p-3 rounded-lg border ${
        rule.status === "pass"
          ? "bg-success/5 border-success/20"
          : rule.status === "warn"
          ? "bg-warning/5 border-warning/20"
          : "bg-error/5 border-error/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {rule.status === "pass" ? (
            <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
          ) : rule.status === "warn" ? (
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-error mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium text-sm">{rule.name}</p>
            <p className="text-xs text-scai-text-sec">{rule.message}</p>
          </div>
        </div>
        <div className="text-right text-xs flex-shrink-0">
          <div className="text-scai-text-muted">Expected: {rule.expected}</div>
          <div
            className={
              rule.status === "pass"
                ? "text-success"
                : rule.status === "warn"
                ? "text-warning"
                : "text-error"
            }
          >
            Actual: {rule.actual}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ValidationPanel;
