"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  usePhoneInput,
  FlagImage,
  defaultCountries,
  parseCountry,
} from "react-international-phone";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
  defaultCountry?: string;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

// ─── Pre-parsed country list (computed once) ────────────────────────────────

const countries = defaultCountries.map((c) => parseCountry(c));

// ─── PhoneInput ─────────────────────────────────────────────────────────────

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onChange,
      defaultCountry = "us",
      label,
      error,
      helperText,
      disabled,
      className,
    },
    ref
  ) => {
    const generatedId = React.useId();
    const [isFocused, setIsFocused] = React.useState(false);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);

    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);

    const {
      inputValue,
      handlePhoneValueChange,
      inputRef,
      country,
      setCountry,
    } = usePhoneInput({
      defaultCountry,
      value,
      countries: defaultCountries,
      disableDialCodePrefill: true,
      onChange: (data) => {
        onChange(data.phone);
      },
    });

    // Merge forwarded ref with inputRef from hook
    const mergedRef = React.useMemo(() => {
      return (node: HTMLInputElement | null) => {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current =
          node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current =
            node;
        }
      };
    }, [inputRef, ref]);

    // Filter countries by search term
    const filteredCountries = React.useMemo(() => {
      if (!search.trim()) return countries;
      const term = search.toLowerCase();
      return countries.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.dialCode.includes(term) ||
          c.iso2.includes(term)
      );
    }, [search]);

    // Reset state when dropdown closes
    React.useEffect(() => {
      if (!dropdownOpen) {
        setSearch("");
        setHighlightedIndex(0);
      }
    }, [dropdownOpen]);

    // Reset highlighted index when filter changes
    React.useEffect(() => {
      setHighlightedIndex(0);
    }, [filteredCountries.length]);

    // Focus search input when dropdown opens
    React.useEffect(() => {
      if (dropdownOpen) {
        // Small delay to let the DOM render
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }
    }, [dropdownOpen]);

    // Click outside to close
    React.useEffect(() => {
      if (!dropdownOpen) return;
      const handler = (e: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node)
        ) {
          setDropdownOpen(false);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [dropdownOpen]);

    // Scroll highlighted item into view
    React.useEffect(() => {
      if (!dropdownOpen || !listRef.current) return;
      const items = listRef.current.querySelectorAll("[data-country-item]");
      items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }, [highlightedIndex, dropdownOpen]);

    const selectCountry = (iso2: string) => {
      setCountry(iso2);
      setDropdownOpen(false);
      // Refocus the phone input after selection
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current?.focus();
    };

    const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((i) =>
            i < filteredCountries.length - 1 ? i + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((i) =>
            i > 0 ? i - 1 : filteredCountries.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCountries[highlightedIndex]) {
            selectCountry(filteredCountries[highlightedIndex].iso2);
          }
          break;
        case "Escape":
          e.preventDefault();
          setDropdownOpen(false);
          break;
      }
    };

    const currentCountry = countries.find((c) => c.iso2 === country.iso2);

    return (
      <motion.div
        className={cn("w-full", className)}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {label && (
          <motion.label
            htmlFor={generatedId}
            className={cn(
              "mb-2 block text-sm font-medium transition-colors",
              isFocused ? "text-scai-brand1" : "text-scai-text",
              error && "text-error"
            )}
          >
            {label}
          </motion.label>
        )}

        <div
          className={cn(
            "flex rounded-xl transition-all duration-200",
            isFocused && !error && "ring-2 ring-scai-brand1/20",
            error && isFocused && "ring-2 ring-error/20"
          )}
        >
          {/* Country selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setDropdownOpen((o) => !o)}
              className={cn(
                "flex h-11 flex-shrink-0 items-center gap-1.5 rounded-l-xl border border-r-0 px-3 transition-colors",
                "hover:bg-scai-surface disabled:cursor-not-allowed disabled:opacity-50",
                error
                  ? "border-error"
                  : isFocused || dropdownOpen
                    ? "border-scai-brand1"
                    : "border-scai-border",
                "bg-scai-input"
              )}
            >
              <FlagImage
                iso2={country.iso2}
                style={{ width: 20, height: 15, borderRadius: 2 }}
              />
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-scai-text-muted transition-transform",
                  dropdownOpen && "rotate-180"
                )}
              />
            </button>

            {/* Inline dropdown — no portal, renders inside the Sheet DOM */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full z-50 mt-1 w-[280px] overflow-hidden rounded-xl border border-scai-border bg-scai-card shadow-card"
                  onKeyDown={handleDropdownKeyDown}
                >
                  {/* Search */}
                  <div className="border-b border-scai-border p-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-scai-text-muted" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search countries..."
                        className="h-8 w-full rounded-lg border border-scai-border bg-scai-input pl-8 pr-3 text-xs text-scai-text placeholder:text-scai-text-muted focus:border-scai-brand1 focus:outline-none"
                        onKeyDown={handleDropdownKeyDown}
                      />
                    </div>
                  </div>

                  {/* Country list */}
                  <div
                    ref={listRef}
                    className="max-h-[250px] overflow-y-auto overscroll-contain py-1"
                  >
                    {filteredCountries.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-scai-text-muted">
                        No countries found
                      </p>
                    ) : (
                      filteredCountries.map((c, index) => (
                        <button
                          key={c.iso2}
                          type="button"
                          data-country-item
                          onClick={() => selectCountry(c.iso2)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={cn(
                            "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                            index === highlightedIndex && "bg-scai-surface",
                            c.iso2 === country.iso2 &&
                              "text-scai-brand1"
                          )}
                        >
                          <FlagImage
                            iso2={c.iso2}
                            style={{
                              width: 20,
                              height: 15,
                              borderRadius: 2,
                              flexShrink: 0,
                            }}
                          />
                          <span className="flex-1 truncate text-scai-text">
                            {c.name}
                          </span>
                          <span className="flex-shrink-0 text-xs text-scai-text-muted">
                            +{c.dialCode}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Phone number input */}
          <input
            id={generatedId}
            ref={mergedRef}
            type="tel"
            value={inputValue}
            onChange={handlePhoneValueChange}
            disabled={disabled}
            placeholder={
              currentCountry
                ? `+${currentCountry.dialCode} ...`
                : "Phone number"
            }
            className={cn(
              "flex h-11 flex-1 rounded-r-xl border border-l-0 bg-scai-input px-4 py-2 text-sm text-scai-text",
              "placeholder:text-scai-text-muted",
              "focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-200",
              error
                ? "border-error"
                : isFocused
                  ? "border-scai-brand1"
                  : "border-scai-border"
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </div>

        {/* Error / helper text */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              className="mt-1.5 text-sm text-error"
              initial={{ opacity: 0, x: -10 }}
              animate={{
                opacity: 1,
                x: [0, -4, 4, -4, 4, 0],
              }}
              exit={{ opacity: 0, x: -10 }}
              transition={{
                opacity: { duration: 0.15 },
                x: { duration: 0.4, ease: "easeInOut" },
              }}
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
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
