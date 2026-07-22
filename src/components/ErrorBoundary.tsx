import { Component, type ErrorInfo, type ReactNode } from "react";
import { logError } from "@/lib/errorTracking";

type Props = { children: ReactNode };
type State = { hasError: boolean };

// Top-level crash guard — without this, an uncaught render error unmounts
// the whole React tree and the visitor sees a blank white page with no way
// back. Logs to error_logs (see errorTracking.ts) so it's visible in
// Admin → Error Logs instead of only in a console nobody has open.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError(error.message, { stack: error.stack ?? info.componentStack ?? undefined, context: "ErrorBoundary" });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            This page ran into an unexpected error. Reloading usually fixes it — if it keeps happening, please get in touch.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110"
            >
              Reload page
            </button>
            <a href="/" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
              Go home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
