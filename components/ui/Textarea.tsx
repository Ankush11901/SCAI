"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  success?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, success, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
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
        <motion.div
          className="relative"
          animate={{
            boxShadow: isFocused
              ? "0 0 0 3px rgba(66, 211, 146, 0.1)"
              : "0 0 0 0px rgba(66, 211, 146, 0)",
          }}
          transition={{ duration: 0.2 }}
          style={{ borderRadius: "0.75rem" }}
        >
          <textarea
            id={textareaId}
            className={cn(
              "flex min-h-[80px] w-full rounded-xl border bg-scai-input px-4 py-3 text-sm text-scai-text",
              "placeholder:text-scai-text-muted",
              "focus:outline-none focus:border-scai-brand1 focus:ring-2 focus:ring-scai-brand1/20",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-200 resize-y",
              error && "border-error focus:border-error focus:ring-error/20",
              success &&
                "border-success focus:border-success focus:ring-success/20",
              !error && !success && "border-scai-border",
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
        </motion.div>
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
Textarea.displayName = "Textarea";

export { Textarea };
