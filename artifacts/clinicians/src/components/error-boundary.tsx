import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Card, CardContent } from '@workspace/stillwell-design-system/components/ui/card';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background p-6">
      <Card className="w-full max-w-lg border-border shadow-none">
        <CardContent className="text-center">
          <h1 className="font-serif text-3xl text-foreground">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
          This part of the app hit an error. The rest of the app is still
          running.
          </p>
          {import.meta.env.DEV ? (
            <p role="status" className="mt-4 break-words rounded-xl bg-secondary p-3 text-left text-xs text-muted-foreground">
              {error.message || String(error)}
            </p>
          ) : null}
          <Button className="mt-5" onClick={resetError} data-testid="button-error-boundary-retry">Try again</Button>
        </CardContent>
      </Card>
    </main>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      'ErrorBoundary caught an error:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}
