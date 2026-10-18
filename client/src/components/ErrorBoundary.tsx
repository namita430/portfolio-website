import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

/** Last line of defence: a rendering bug shows a friendly message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-display text-4xl">Something went wrong.</p>
          <p className="mx-auto mt-3 max-w-md text-muted">An unexpected error occurred while displaying this page. Reloading usually fixes it.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-6 font-medium text-accent-fg"
          >
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}
