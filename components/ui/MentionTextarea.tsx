"use client";

import * as React from "react";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils/cn";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MentionOption {
  id: string;
  label: string;
  description?: string;
}

export interface MentionTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  label?: string;
  error?: string;
  helperText?: string;
  mentions: MentionOption[];
  value: string;
  onChange: (value: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const MentionTextarea = React.forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      mentions,
      value,
      onChange,
      id,
      ...props
    },
    forwardedRef
  ) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    // Internal ref for textarea
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (forwardedRef as React.RefObject<HTMLTextAreaElement>) || internalRef;

    // Container ref for positioning
    const containerRef = useRef<HTMLDivElement>(null);

    // Mention state
    const [showMention, setShowMention] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionStartIndex, setMentionStartIndex] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isFocused, setIsFocused] = useState(false);

    // Filter mentions based on query
    const filteredMentions = useMemo(() => {
      if (!mentionQuery) return mentions;
      const q = mentionQuery.toLowerCase();
      return mentions.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.label.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q)
      );
    }, [mentions, mentionQuery]);

    // Reset selected index when filtered list changes
    useEffect(() => {
      setSelectedIndex(0);
    }, [filteredMentions.length]);

    // ─────────────────────────────────────────────────────────────────────────────
    // Handlers
    // ─────────────────────────────────────────────────────────────────────────────

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;

        onChange(newValue);

        // Find @ before cursor
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const atIndex = textBeforeCursor.lastIndexOf("@");

        if (atIndex !== -1) {
          const query = textBeforeCursor.slice(atIndex + 1);
          // Only show if no space after @ (still typing mention)
          if (!query.includes(" ") && !query.includes("\n")) {
            setShowMention(true);
            setMentionQuery(query);
            setMentionStartIndex(atIndex);
            return;
          }
        }
        setShowMention(false);
        setMentionQuery("");
      },
      [onChange]
    );

    const insertMention = useCallback(
      (option: MentionOption) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const before = value.slice(0, mentionStartIndex);
        const after = value.slice(textarea.selectionStart);

        const newValue = `${before}{{${option.id}}}${after}`;
        onChange(newValue);

        // Move cursor after inserted mention
        const newCursorPos = before.length + option.id.length + 4; // {{}}
        setTimeout(() => {
          if (textarea) {
            textarea.selectionStart = textarea.selectionEnd = newCursorPos;
            textarea.focus();
          }
        }, 0);

        setShowMention(false);
        setMentionQuery("");
      },
      [value, mentionStartIndex, onChange, textareaRef]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showMention || filteredMentions.length === 0) return;

        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredMentions.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(filteredMentions[selectedIndex]);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setShowMention(false);
          setMentionQuery("");
        }
      },
      [showMention, filteredMentions, selectedIndex, insertMention]
    );

    const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      // Delay hiding to allow click on mention item
      setTimeout(() => {
        setShowMention(false);
        setMentionQuery("");
      }, 200);
      props.onBlur?.(e);
    }, [props]);

    const handleFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    }, [props]);

    // ─────────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────────

    return (
      <motion.div
        ref={containerRef}
        className="relative w-full"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {label && (
          <motion.label
            htmlFor={textareaId}
            className={cn(
              "block text-sm font-medium mb-2 transition-colors",
              isFocused ? "text-scai-brand1" : "text-scai-text",
              error && "text-error"
            )}
          >
            {label}
          </motion.label>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            id={textareaId}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              "flex min-h-[120px] w-full rounded-xl border bg-scai-input px-4 py-3 text-sm text-scai-text font-mono",
              "placeholder:text-scai-text-muted",
              "focus:outline-none focus:border-scai-brand1 focus:ring-2 focus:ring-scai-brand1/20",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-200 resize-y",
              error && "border-error focus:border-error focus:ring-error/20",
              !error && "border-scai-border",
              className
            )}
            {...props}
          />

          {/* Mention Popover */}
          <AnimatePresence>
            {showMention && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={cn(
                  "absolute left-0 right-0 z-50 mt-1",
                  "max-h-[240px] overflow-y-auto",
                  "rounded-xl border border-scai-border bg-scai-card shadow-lg"
                )}
              >
                {filteredMentions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-scai-text-muted">
                    No matching parameters
                  </div>
                ) : (
                  <div className="py-1">
                    {filteredMentions.map((option, index) => (
                      <motion.button
                        key={option.id}
                        type="button"
                        onClick={() => insertMention(option)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          "w-full flex flex-col items-start px-4 py-2.5 text-left",
                          "transition-colors duration-100",
                          index === selectedIndex
                            ? "bg-scai-brand1/10 text-scai-brand1"
                            : "text-scai-text hover:bg-scai-surface"
                        )}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">
                            @{option.id}
                          </span>
                          <span className="text-xs text-scai-text-muted">
                            → {`{{${option.id}}}`}
                          </span>
                        </div>
                        {option.description && (
                          <span className="text-xs text-scai-text-muted mt-0.5 line-clamp-1">
                            {option.description}
                          </span>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Hint */}
                <div className="border-t border-scai-border px-4 py-2 text-xs text-scai-text-muted flex items-center gap-4">
                  <span>
                    <kbd className="px-1.5 py-0.5 rounded bg-scai-surface text-[10px] font-mono">↑↓</kbd> navigate
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 rounded bg-scai-surface text-[10px] font-mono">Enter</kbd> select
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 rounded bg-scai-surface text-[10px] font-mono">Esc</kbd> close
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error/Helper Text */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              className="mt-1.5 text-sm text-error"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              {error}
            </motion.p>
          )}
          {helperText && !error && (
            <motion.p
              key="helper"
              className="mt-1.5 text-sm text-scai-text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {helperText}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

MentionTextarea.displayName = "MentionTextarea";

export { MentionTextarea };
