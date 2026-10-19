import type { ReactNode } from "react";
import mark from "@workspace/stillwell-design-system/brand/stillwell-mark.svg";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";

type PatientRosterLayoutProps = {
  children: ReactNode;
  onBack?: () => void;
};

export function PatientRosterLayout({ children, onBack }: PatientRosterLayoutProps) {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="border-b border-border bg-secondary">
        <p className="mx-auto max-w-7xl px-4 py-2 text-center text-xs font-medium text-secondary-foreground sm:px-6">
          Design preview · fictional patients
        </p>
      </div>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <img src={mark} alt="" width="36" height="36" className="h-9 w-9" />
            <span className="font-serif text-xl font-semibold tracking-tight text-foreground">stillwell</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">Clinician workspace</span>
          </div>
          {onBack ? (
            <Button type="button" variant="outline" size="sm" onClick={onBack}>
              Back to patient list
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Fictional examples · no accounts connected</p>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {children}
        <footer className="border-t border-border pt-4">
          <p className="text-xs leading-5 text-muted-foreground">
            Design concept only. No actual journals or accounts are connected. Sharing scope shown here is simulated and patient-chosen; all names, dates, ratings, and reflections are fictional.
          </p>
        </footer>
      </div>
    </main>
  );
}
