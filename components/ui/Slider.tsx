"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils/cn";

interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  label?: string;
  showValue?: boolean;
  valueFormat?: (value: number) => string;
}

/**
 * Slider
 * Radix UI based slider with SCAI styling
 */
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      className,
      label,
      showValue = true,
      valueFormat,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const currentValue = value ?? defaultValue ?? [0];
    const displayValue = Array.isArray(currentValue)
      ? currentValue[0]
      : currentValue;

    return (
      <div className="space-y-2">
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && (
              <span
                className="text-sm font-medium text-scai-text"
                id={`slider-label-${label?.replace(/\s/g, "-")}`}
              >
                {label}
              </span>
            )}
            {showValue && (
              <span className="text-sm text-scai-text-muted">
                {valueFormat ? valueFormat(displayValue) : displayValue}
              </span>
            )}
          </div>
        )}
        <SliderPrimitive.Root
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          aria-label={label}
          className={cn(
            "relative flex w-full touch-none select-none items-center",
            className
          )}
          {...props}
        >
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/20">
            <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-scai-brand1 to-scai-brand2" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            className={cn(
              "block h-4 w-4 rounded-full border-2 border-white bg-gradient-to-r from-scai-brand1 to-scai-brand2 shadow-lg",
              "focus:outline-none focus:ring-2 focus:ring-scai-brand1/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-shadow cursor-grab active:cursor-grabbing"
            )}
          />
        </SliderPrimitive.Root>
      </div>
    );
  }
);
Slider.displayName = "Slider";

/**
 * RangeSlider
 * Dual-thumb slider for range selection
 */
const RangeSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      className,
      label,
      showValue = true,
      valueFormat,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const currentValue = value ?? defaultValue ?? [0, 100];
    const minValue = Array.isArray(currentValue) ? currentValue[0] : 0;
    const maxValue = Array.isArray(currentValue) ? currentValue[1] : 100;

    return (
      <div className="space-y-2">
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && (
              <span className="text-sm font-medium text-scai-text">
                {label}
              </span>
            )}
            {showValue && (
              <span className="text-sm text-scai-text-muted">
                {valueFormat
                  ? `${valueFormat(minValue)} - ${valueFormat(maxValue)}`
                  : `${minValue} - ${maxValue}`}
              </span>
            )}
          </div>
        )}
        <SliderPrimitive.Root
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          aria-label={label}
          className={cn(
            "relative flex w-full touch-none select-none items-center",
            className
          )}
          {...props}
        >
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/20">
            <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-scai-brand1 to-scai-brand2" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            className={cn(
              "block h-4 w-4 rounded-full border-2 border-white bg-gradient-to-r from-scai-brand1 to-scai-brand2 shadow-lg",
              "focus:outline-none focus:ring-2 focus:ring-scai-brand1/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-shadow cursor-grab active:cursor-grabbing"
            )}
          />
          <SliderPrimitive.Thumb
            className={cn(
              "block h-4 w-4 rounded-full border-2 border-white bg-gradient-to-r from-scai-brand1 to-scai-brand2 shadow-lg",
              "focus:outline-none focus:ring-2 focus:ring-scai-brand1/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-shadow cursor-grab active:cursor-grabbing"
            )}
          />
        </SliderPrimitive.Root>
      </div>
    );
  }
);
RangeSlider.displayName = "RangeSlider";

export { Slider, RangeSlider };
