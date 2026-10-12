import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground text-center">
          <div className="p-6 rounded-2xl bg-surface-raised border border-border max-w-md shadow-soft space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-danger/10 text-danger border border-danger/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-base font-bold text-foreground">Something went wrong</h2>
            <p className="text-xs text-foreground-muted leading-relaxed">
              {this.state.error?.message || "An unexpected error occurred while rendering the interface."}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover flex items-center justify-center gap-2 mx-auto active:scale-95 transition-all shadow-soft"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
