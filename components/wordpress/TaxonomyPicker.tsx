"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Sparkles, Plus } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/utils/cn";

interface TaxonomyPickerProps {
  label: string;
  placeholder?: string;
  /** Existing items from the CMS site */
  available: { name: string; count: number }[];
  /** Currently selected item names */
  selected: string[];
  /** AI-suggested items (subset of available + newSuggestions) */
  suggested?: string[];
  /** AI-suggested new items not in the site's taxonomy */
  newSuggestions?: string[];
  onChange: (selected: string[]) => void;
}

export function TaxonomyPicker({
  label,
  placeholder = "Search or add...",
  available,
  selected,
  suggested = [],
  newSuggestions = [],
  onChange,
}: TaxonomyPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // All selectable names: existing + new suggestions
  const allAvailable = [
    ...available.map((a) => a.name),
    ...newSuggestions.filter((n) => !available.some((a) => a.name.toLowerCase() === n.toLowerCase())),
  ];

  // Filter by search
  const filtered = allAvailable.filter(
    (name) =>
      name.toLowerCase().includes(search.toLowerCase()) &&
      !selected.some((s) => s.toLowerCase() === name.toLowerCase())
  );

  const isSuggested = (name: string) =>
    suggested.some((s) => s.toLowerCase() === name.toLowerCase());

  const isNew = (name: string) =>
    newSuggestions.some((n) => n.toLowerCase() === name.toLowerCase()) &&
    !available.some((a) => a.name.toLowerCase() === name.toLowerCase());

  const getCount = (name: string) =>
    available.find((a) => a.name.toLowerCase() === name.toLowerCase())?.count;

  const addItem = (name: string) => {
    if (!selected.some((s) => s.toLowerCase() === name.toLowerCase())) {
      onChange([...selected, name]);
    }
    setSearch("");
  };

  const removeItem = (name: string) => {
    onChange(selected.filter((s) => s.toLowerCase() !== name.toLowerCase()));
  };

  const addCustom = () => {
    const trimmed = search.trim();
    if (trimmed && !selected.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...selected, trimmed]);
      setSearch("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) {
        addItem(filtered[0]);
      } else if (search.trim()) {
        addCustom();
      }
    }
    if (e.key === "Backspace" && !search && selected.length > 0) {
      removeItem(selected[selected.length - 1]);
    }
  };

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const hasNoMatch = search.trim() && filtered.length === 0;

  return (
    <div>
      <label className="block text-sm font-medium text-scai-text-sec mb-2">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full min-h-[2.75rem] items-center gap-1.5 flex-wrap rounded-xl border px-3 py-2 text-left transition-all",
              "bg-scai-input border-scai-border",
              "hover:border-scai-border-bright",
              open && "border-scai-brand1 ring-2 ring-scai-brand1/20"
            )}
          >
            {selected.length === 0 && (
              <span className="text-sm text-scai-text-muted">{placeholder}</span>
            )}
            {selected.map((name) => (
              <span
                key={name}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
                  isNew(name)
                    ? "bg-scai-brand1/15 text-scai-brand1 border border-scai-brand1/30"
                    : isSuggested(name)
                      ? "bg-scai-brand1/10 text-scai-brand1"
                      : "bg-scai-surface text-scai-text-sec"
                )}
              >
                {isSuggested(name) && <Sparkles className="w-2.5 h-2.5" />}
                {isNew(name) && <Plus className="w-2.5 h-2.5" />}
                {name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(name);
                  }}
                  className="ml-0.5 hover:text-error transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <ChevronDown className={cn(
              "w-4 h-4 ml-auto text-scai-text-muted transition-transform flex-shrink-0",
              open && "rotate-180"
            )} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0 max-h-60 overflow-hidden"
        >
          <div className="p-2 border-b border-scai-border">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-scai-text outline-none placeholder:text-scai-text-muted"
            />
          </div>
          <div className="overflow-y-auto max-h-48 p-1">
            {filtered.length === 0 && !hasNoMatch && (
              <p className="px-3 py-2 text-xs text-scai-text-muted">
                {selected.length === allAvailable.length
                  ? "All items selected"
                  : "No items available"}
              </p>
            )}
            {filtered.map((name) => {
              const count = getCount(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => addItem(name)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm rounded-lg text-left text-scai-text hover:bg-scai-brand1/10 transition-colors"
                >
                  <span className="flex-1 truncate">{name}</span>
                  {isSuggested(name) && (
                    <Sparkles className="w-3 h-3 text-scai-brand1 flex-shrink-0" />
                  )}
                  {isNew(name) && (
                    <span className="text-[9px] font-medium px-1 rounded bg-scai-brand1/15 text-scai-brand1">
                      New
                    </span>
                  )}
                  {count !== undefined && (
                    <span className="text-[10px] text-scai-text-muted flex-shrink-0">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {hasNoMatch && (
              <button
                type="button"
                onClick={addCustom}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm rounded-lg text-left text-scai-brand1 hover:bg-scai-brand1/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create &quot;{search.trim()}&quot;</span>
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
