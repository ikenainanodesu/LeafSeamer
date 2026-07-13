import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";
import { Button } from "./Button";

interface ErrorBoundaryState {
  error: Error | null;
}

export class PanelErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Dashboard render failed", error, info);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="leaf-section-body" role="alert">
        <h1 className="leaf-panel-title">Panel unavailable</h1>
        <p>{this.state.error.message}</p>
        <Button tone="primary" onClick={() => globalThis.location.reload()}>Reload Panel</Button>
      </div>
    );
  }
}
