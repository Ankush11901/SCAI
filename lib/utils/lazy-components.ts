/**
 * Lazy Loading Utilities for Performance Optimization
 * 
 * This module provides utilities for lazy loading components
 * and implementing code splitting strategies.
 */

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// Loading skeleton component types
export interface LoadingSkeletonProps {
  height?: string;
  className?: string;
}

/**
 * Creates a dynamically imported component with loading state
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  loadingFallback?: React.ReactNode
) {
  return dynamic(importFn, {
    loading: () => loadingFallback as React.ReactElement || null,
    ssr: true,
  });
}

/**
 * Creates a client-only dynamically imported component
 * Use this for components that cannot be server-rendered
 */
export function createClientOnlyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  loadingFallback?: React.ReactNode
) {
  return dynamic(importFn, {
    loading: () => loadingFallback as React.ReactElement || null,
    ssr: false,
  });
}

// Lazy loaded heavy components
export const LazyValidationPanel = dynamic(
  () => import("@/components/generate/ValidationPanel"),
  { ssr: false }
);

export const LazyMatrixTable = dynamic(
  () => import("@/components/matrix/MatrixTable"),
  { ssr: false }
);

export const LazyVariationModal = dynamic(
  () => import("@/components/variations/VariationModal"),
  { ssr: false }
);

export const LazyVariationGrid = dynamic(
  () => import("@/components/variations/VariationGrid"),
  { ssr: false }
);

// Prefetch functions for anticipated navigation
export function prefetchComponent(
  importFn: () => Promise<unknown>
) {
  // Only prefetch in browser
  if (typeof window !== "undefined") {
    // Use requestIdleCallback if available for non-critical prefetching
    if ("requestIdleCallback" in window) {
      (window as typeof window & { requestIdleCallback: (cb: () => void) => void })
        .requestIdleCallback(() => {
          importFn().catch(() => {
            // Silently fail prefetch errors
          });
        });
    } else {
      // Fallback to setTimeout
      setTimeout(() => {
        importFn().catch(() => {
          // Silently fail prefetch errors
        });
      }, 100);
    }
  }
}

// Prefetch commonly navigated routes
export function prefetchCommonComponents() {
  prefetchComponent(() => import("@/components/generate/ArticlePreview"));
  prefetchComponent(() => import("@/components/generate/GeneratorForm"));
}
