"use client";

import * as React from "react";
import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils/cn";

// Card animation variants
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      delay: index * 0.05,
      ease: "easeOut",
    },
  }),
};

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
  hoverLift?: boolean;
  clickFeedback?: boolean;
  loading?: boolean;
}

/**
 * AnimatedCard
 * A card component with built-in animations:
 * - Staggered entrance animation
 * - Hover lift effect
 * - Click feedback
 * - Loading shimmer
 */
function AnimatedCard({
  children,
  className,
  index = 0,
  hoverLift = true,
  clickFeedback = true,
  loading = false,
}: AnimatedCardProps) {
  return (
    <motion.div
      className={cn(
        "bg-scai-card border border-scai-border rounded-xl p-5 relative overflow-hidden",
        loading && "pointer-events-none",
        className
      )}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={
        hoverLift
          ? {
              y: -4,
              boxShadow: "0 10px 30px -10px rgba(66, 211, 146, 0.2)",
              transition: { duration: 0.2 },
            }
          : undefined
      }
      whileTap={clickFeedback ? { scale: 0.98 } : undefined}
    >
      {loading && <CardShimmer />}
      {children}
    </motion.div>
  );
}

/**
 * CardShimmer
 * Loading shimmer overlay for cards
 */
const CardShimmer = () => (
  <motion.div
    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
    animate={{
      x: ["-100%", "100%"],
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: "linear",
    }}
  />
);

/**
 * CardContent
 * Wrapper for card content with fade-in animation
 */
function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("relative z-10", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * CardHeader
 * Animated card header
 */
function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between mb-3", className)}>
      {children}
    </div>
  );
}

/**
 * CardTitle
 * Card title with text styling
 */
function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("font-semibold text-scai-text", className)}>
      {children}
    </h3>
  );
}

/**
 * CardDescription
 * Card description text
 */
function CardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-scai-text-sec", className)}>{children}</p>
  );
}

export {
  AnimatedCard,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardShimmer,
};
