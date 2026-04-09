"use client";

import * as React from "react";
import { motion, AnimatePresence, type HTMLMotionProps } from "motion/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variants = {
  primary:
    "bg-gradient-primary text-scai-page font-semibold hover:opacity-90 shadow-glow",
  secondary:
    "bg-scai-card border border-scai-border text-scai-text hover:bg-scai-border/50",
  ghost: "text-scai-text hover:bg-scai-border/30",
  destructive: "bg-error text-white hover:bg-error/90",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
  icon: "p-3 rounded-xl",
};

// Spring physics for button interactions
const springConfig = {
  hover: { type: "spring" as const, stiffness: 400, damping: 17 },
  tap: { type: "spring" as const, stiffness: 600, damping: 20 },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "relative overflow-hidden",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isDisabled}
        whileHover={isDisabled ? undefined : { scale: 1.02 }}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        transition={springConfig.hover}
        {...props}
      >
        {/* Loading spinner with transition */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
              transition={{ duration: 0.15 }}
              className="absolute left-1/2 -translate-x-1/2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
            </motion.span>
          ) : null}
        </AnimatePresence>

        {/* Content with fade when loading */}
        <motion.span
          className="inline-flex items-center gap-2"
          animate={{ opacity: isLoading ? 0 : 1 }}
          transition={{ duration: 0.15 }}
        >
          {leftIcon && (
            <motion.span
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
            >
              {leftIcon}
            </motion.span>
          )}
          {children}
          {rightIcon && (
            <motion.span
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
            >
              {rightIcon}
            </motion.span>
          )}
        </motion.span>
      </motion.button>
    );
  }
);

Button.displayName = "Button";
