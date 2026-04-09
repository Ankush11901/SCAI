"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      success,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <motion.div
        className="w-full"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {label && (
          <motion.label
            htmlFor={inputId}
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
          {leftIcon && (
            <motion.div
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                isFocused ? "text-scai-brand1" : "text-scai-text-muted"
              )}
              animate={{ scale: isFocused ? 1.1 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {leftIcon}
            </motion.div>
          )}
          <input
            type={type}
            id={inputId}
            className={cn(
              "flex h-11 w-full rounded-xl border bg-scai-input px-4 py-2 text-sm text-scai-text",
              "placeholder:text-scai-text-muted",
              "focus:outline-none focus:border-scai-brand1 focus:ring-2 focus:ring-scai-brand1/20",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-200",
              error && "border-error focus:border-error focus:ring-error/20",
              success &&
                "border-success focus:border-success focus:ring-success/20",
              !error && !success && "border-scai-border",
              leftIcon && "pl-11",
              (rightIcon || success) && "pr-11",
              className
            )}
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          {/* Success checkmark or right icon */}
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-success"
                initial={{ opacity: 0, scale: 0, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0, rotate: 45 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <Check className="w-4 h-4" />
              </motion.div>
            ) : rightIcon ? (
              <motion.div
                key="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-scai-text-muted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {rightIcon}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        {/* Error message with shake animation */}
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
Input.displayName = "Input";

export { Input };
