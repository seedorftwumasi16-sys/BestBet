"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AdminErrorBoundaryProps {
  section: string;
  children: React.ReactNode;
}

interface AdminErrorBoundaryState {
  error: Error | null;
}

export class AdminErrorBoundary extends React.Component<AdminErrorBoundaryProps, AdminErrorBoundaryState> {
  state: AdminErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AdminErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[Admin:${this.props.section}]`, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="shrink-0 text-red-400 mt-0.5" size={22} />
            <div>
              <h3 className="font-bold text-red-200">Something went wrong in {this.props.section}</h3>
              <p className="text-sm text-red-200/80 mt-1">
                {this.state.error.message || "An unexpected error occurred. You can try again or switch to another section."}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleRetry}>
            <RefreshCw size={14} className="mr-1" /> Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
