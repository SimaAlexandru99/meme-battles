"use client";

import React from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { ErrorHandler } from "@/lib/utils/error-handler";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  errorId: string | null;
}

/**
 * Default error fallback component with user-friendly messaging
 */
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  errorId,
}) => {
  const friendlyError = ErrorHandler.getUserFriendlyMessage(error);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>{friendlyError.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {friendlyError.action && (
            <p className="text-sm text-muted-foreground text-center">
              {friendlyError.action}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {friendlyError.canRetry && (
              <Button onClick={resetError} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Reload Page
            </Button>
          </div>

          {errorId && (
            <p className="text-xs text-muted-foreground text-center">
              Error ID: {errorId}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Enhanced error boundary with retry mechanisms and user-friendly error handling
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry with React error boundary context
    Sentry.captureException(error, {
      level: "error",
      extra: {
        ...errorInfo,
        errorBoundary: true,
        errorId: this.state.errorId,
      },
      tags: {
        component: "ErrorBoundary",
      },
    });

    // Log error using our error handler
    ErrorHandler.logError(error, {
      operation: "react_error_boundary",
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
      },
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error state if resetKeys have changed
    if (hasError && resetOnPropsChange && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || [];
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevResetKeys[index],
      );

      if (hasResetKeyChanged) {
        this.resetError();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetError = () => {
    // Clear any existing timeout
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });

    // Log error recovery
    Sentry.addBreadcrumb({
      message: "Error boundary reset by user",
      level: "info",
      data: {
        errorId: this.state.errorId,
      },
    });
  };

  render() {
    const { hasError, error, errorId } = this.state;
    const { children, fallback: FallbackComponent = DefaultErrorFallback } =
      this.props;

    if (hasError && error) {
      return (
        <FallbackComponent
          error={error}
          resetError={this.resetError}
          errorId={errorId}
        />
      );
    }

    return children;
  }
}

/**
 * Hook for handling async errors in functional components
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    ErrorHandler.logError(error, {
      operation: "async_error_handler",
    });
    setError(error);
  }, []);

  // Throw error to be caught by error boundary
  if (error) {
    throw error;
  }

  return { handleError, resetError };
};

/**
 * Higher-order component for wrapping components with error boundary
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">,
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};
