"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";

/**
 * PageHeader
 * Consistent page header with title, description, and actions
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-scai-text-sec">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </motion.div>
  );
}

/**
 * PageContent
 * Main content wrapper with consistent spacing
 */
interface PageContentProps {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function PageContent({
  children,
  className,
  fullWidth = false,
}: PageContentProps) {
  return (
    <motion.div
      className={cn("flex-1", !fullWidth && "space-y-6", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * PageActions
 * Sticky action bar at bottom of page
 */
interface PageActionsProps {
  children: ReactNode;
  className?: string;
}

export function PageActions({ children, className }: PageActionsProps) {
  return (
    <motion.div
      className={cn(
        "sticky bottom-0 left-0 right-0 flex items-center justify-end gap-3 border-t border-scai-border bg-scai-card/80 backdrop-blur-sm p-4 -mx-4 lg:-mx-6",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * PageSection
 * Grouped section within a page
 */
interface PageSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function PageSection({
  title,
  description,
  children,
  className,
}: PageSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {description && (
            <p className="text-sm text-scai-text-sec">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * PageCard
 * Card container for page content
 */
interface PageCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function PageCard({
  children,
  className,
  hover = false,
}: PageCardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-xl border border-scai-border bg-scai-card p-4 lg:p-6",
        hover && "transition-colors hover:border-scai-brand1/30",
        className
      )}
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * PageGrid
 * Responsive grid layout for page content
 */
interface PageGridProps {
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
}

export function PageGrid({ children, className, cols = 3 }: PageGridProps) {
  const colsClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4 lg:gap-6", colsClass[cols], className)}>
      {children}
    </div>
  );
}

/**
 * EmptyState
 * Placeholder for empty content areas
 */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-scai-input text-scai-text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-scai-text-sec">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
