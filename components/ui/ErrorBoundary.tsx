"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays a fallback UI
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log to console in development
    console.error("Error caught by boundary:", error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-error" />
            </div>

            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-scai-text-sec mb-6">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>

            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={this.handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="ghost"
                onClick={() => (window.location.href = "/generate")}
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {/* Development info */}
            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-scai-text-muted flex items-center gap-1">
                  <Bug className="w-3 h-3" />
                  Stack trace (dev only)
                </summary>
                <pre className="mt-2 p-3 bg-scai-input rounded-lg text-xs overflow-auto text-error/80">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-friendly error boundary wrapper
 */
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallbackRender?: (props: { error: Error; reset: () => void }) => ReactNode;
}

export function ErrorBoundaryWrapper({
  children,
  fallbackRender,
}: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      fallback={
        fallbackRender ? undefined : (
          <ErrorFallback
            message="Something went wrong"
            onRetry={() => window.location.reload()}
          />
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Simple error fallback component
 */
interface ErrorFallbackProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorFallback({
  message = "Something went wrong",
  onRetry,
}: ErrorFallbackProps) {
  return (
    <div className="p-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6 text-error" />
      </div>
      <p className="text-scai-text-sec mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Inline error display for API errors
 */
interface ApiErrorDisplayProps {
  error: string | null;
  onDismiss?: () => void;
  className?: string;
}

export function ApiErrorDisplay({
  error,
  onDismiss,
  className = "",
}: ApiErrorDisplayProps) {
  if (!error) return null;

  return (
    <div
      className={`bg-error/10 border border-error/20 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-error">Error</p>
          <p className="text-sm text-error/80 mt-0.5">{error}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-error/60 hover:text-error transition-colors"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
