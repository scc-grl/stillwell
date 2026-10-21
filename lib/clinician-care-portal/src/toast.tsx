import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';

type Notify = (message: string, durationMs?: number) => void;
const ToastContext = createContext<Notify>(() => undefined);

export function useNotify(): Notify {
  return useContext(ToastContext);
}

/** One quiet status toast at a time; content is never logged. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; duration: number } | null>(null);
  const counter = useRef(0);
  const notify = useCallback<Notify>((message, durationMs = 4000) => {
    counter.current += 1;
    setToast({ id: counter.current, message, duration: durationMs });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:justify-end">
        <div role="status" aria-live="polite" aria-atomic="true">
          {toast ? (
            <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-lg" data-testid="toast-care-portal">
              <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <span>{toast.message}</span>
              <Button variant="ghost" size="icon" aria-label="Dismiss" onClick={() => setToast(null)} data-testid="button-dismiss-toast">
                <X aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
