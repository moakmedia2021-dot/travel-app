"use client";

import * as Sentry from "@sentry/nextjs";
import React from "react";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type State = { hasError: boolean };

/**
 * In-page error boundary for client components.
 * Reports to Sentry and renders a friendly fallback.
 * Use this around interactive widgets that can blow up (charts, maps, modals).
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.withScope((scope) => {
      scope.setContext("react", {
        component_stack: errorInfo.componentStack,
      });
      Sentry.captureException(error);
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 text-center">
            <h3 className="text-base font-semibold text-neutral-900">
              This section couldn&apos;t load
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              The rest of the page should still work. Refresh to try again.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 h-11 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Retry
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
