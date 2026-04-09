"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";

interface RadioGroupProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {
  label?: string;
  error?: string;
}

interface RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  label: string;
  description?: string;
}

/**
 * RadioGroup
 * Radix UI based radio group with SCAI styling and Motion animations
 */
const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(({ className, label, error, children, ...props }, ref) => {
  return (
    <fieldset className="space-y-2 border-0 p-0 m-0">
      {label && (
        <legend className="block text-sm font-medium text-scai-text mb-2">
          {label}
        </legend>
      )}
      <RadioGroupPrimitive.Root
        ref={ref}
        className={cn("grid gap-2", className)}
        {...props}
      >
        {children}
      </RadioGroupPrimitive.Root>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </fieldset>
  );
});
RadioGroup.displayName = "RadioGroup";

/**
 * RadioGroupItem
 * Individual radio button with label and optional description
 */
const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, label, description, ...props }, ref) => {
  return (
    <div className="flex items-start gap-3">
      <RadioGroupPrimitive.Item
        ref={ref}
        className={cn(
          "relative h-5 w-5 rounded-full border border-scai-border bg-scai-input",
          "focus:outline-none focus:ring-2 focus:ring-scai-brand1/50 focus:ring-offset-2 focus:ring-offset-scai-bg",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:border-scai-brand1 data-[state=checked]:bg-scai-brand1",
          "transition-colors",
          className
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="h-2.5 w-2.5 rounded-full bg-scai-bg"
          />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      <div className="flex-1">
        <label
          htmlFor={props.id}
          className="text-sm font-medium text-scai-text cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-scai-text-muted mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
});
RadioGroupItem.displayName = "RadioGroupItem";

/**
 * RadioGroupCard
 * Card-style radio option for larger selections
 */
const RadioGroupCard = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps & { icon?: React.ReactNode }
>(({ className, label, description, icon, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex items-start gap-4 rounded-xl border border-scai-border bg-scai-card p-4",
        "focus:outline-none focus:ring-2 focus:ring-scai-brand1/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-scai-brand1 data-[state=checked]:bg-scai-brand1/5",
        "hover:bg-scai-input/50 cursor-pointer transition-all",
        className
      )}
      {...props}
    >
      {/* Custom radio indicator */}
      <div
        className={cn(
          "h-5 w-5 rounded-full border border-scai-border bg-scai-input flex-shrink-0",
          "data-[state=checked]:border-scai-brand1 data-[state=checked]:bg-scai-brand1",
          "transition-colors"
        )}
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center w-full h-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="h-2.5 w-2.5 rounded-full bg-scai-bg"
          />
        </RadioGroupPrimitive.Indicator>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {icon && <span className="text-scai-brand1">{icon}</span>}
          <span className="text-sm font-medium text-scai-text">{label}</span>
        </div>
        {description && (
          <p className="text-xs text-scai-text-muted mt-1">{description}</p>
        )}
      </div>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupCard.displayName = "RadioGroupCard";

export { RadioGroup, RadioGroupItem, RadioGroupCard };
