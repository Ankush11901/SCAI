"use client";

import { Switch } from "@/components/ui/Switch";

interface ToggleOptionProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleOption({
  icon,
  label,
  description,
  checked,
  onChange,
}: ToggleOptionProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left cursor-pointer ${
        checked
          ? "bg-scai-brand1/5 border-scai-brand1/30"
          : "bg-scai-surface border-scai-border hover:border-scai-border-bright"
      }`}
    >
      <div
        className={`flex-shrink-0 ${
          checked ? "text-scai-brand1" : "text-scai-text-muted"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium text-sm ${
            checked ? "text-scai-text" : "text-scai-text-sec"
          }`}
        >
          {label}
        </p>
        <p className="text-xs text-scai-text-muted">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
