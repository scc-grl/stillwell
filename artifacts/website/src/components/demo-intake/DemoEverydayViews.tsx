import { ArrowRight, BookOpen, CalendarDays, CircleCheck, LayoutDashboard } from "lucide-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import type { Persona } from "./DemoShell";

export function DemoDashboard({ persona, onJournal }: { persona: Persona; onJournal: () => void }) {
  return (
    <section className="space-y-6" data-testid="demo-dashboard">
      <header className="space-y-3">
        <p className="eyebrow">Every day · demo data</p>
        <h1 className="display text-4xl font-medium sm:text-5xl">A little room to recover</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">A fictional dashboard for {persona}. Nothing here is connected to an account or health record.</p>
      </header>
      <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7" data-testid="dashboard-demo-card">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today · illustrative check-in</p>
          <h2 className="display mt-2 text-2xl font-medium">How is today feeling?</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Sample only · no check-in has been recorded.</p>
        </div>
        <Button type="button" variant="outline" className="min-h-11" onClick={onJournal} data-testid="button-dashboard-journal">View sample journal <ArrowRight aria-hidden="true" /></Button>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-3 p-5" data-testid="dashboard-stage-card">
          <div className="flex items-center gap-2 text-primary"><CircleCheck className="size-5" aria-hidden="true" /><p className="text-xs font-semibold uppercase tracking-wider">Made-up roadmap</p></div>
          <h2 className="display text-xl font-medium">Stage 1 · Daily life</h2>
          <p className="text-sm leading-6 text-muted-foreground">A fictional example from the intake demo.</p>
        </Card>
        <Card className="space-y-3 p-5" data-testid="dashboard-journal-card">
          <div className="flex items-center gap-2 text-primary"><BookOpen className="size-5" aria-hidden="true" /><p className="text-xs font-semibold uppercase tracking-wider">Journal</p></div>
          <h2 className="display text-xl font-medium">Your words, day by day</h2>
          <p className="text-sm leading-6 text-muted-foreground">See an illustrative journal entry with no stored records.</p>
        </Card>
      </div>
      <p className="rounded-lg border border-border bg-secondary p-4 text-sm leading-6" data-testid="dashboard-fabricated-notice">Demo data only. This page is local to the demo and isn't connected to patient records.</p>
    </section>
  );
}

export function DemoJournal({ onDashboard }: { onDashboard: () => void }) {
  return (
    <section className="space-y-6" data-testid="demo-journal">
      <header className="space-y-3">
        <p className="eyebrow">Every day · demo data</p>
        <h1 className="display text-4xl font-medium sm:text-5xl">Journal</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">A made-up example of what a journal entry can look like. This view is not connected to records.</p>
      </header>
      <Card className="space-y-5 p-5 sm:p-7" data-testid="journal-entry-demo">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary"><CalendarDays className="size-5" aria-hidden="true" /></span><div><p className="font-semibold">A sample day</p><p className="text-sm text-muted-foreground">Fictional entry · no date recorded</p></div></div>
          <span className="rounded-full bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground">Illustrative only</span>
        </div>
        <p className="text-sm leading-7 text-muted-foreground">“Walking to class felt okay. I took a screen break in the afternoon.”</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {["Headache · Noticeable", "Fatigue · Noticeable", "Fog · Noticeable", "Sleep · Not recorded", "Mood · Not recorded", "Light sensitivity · Noticeable"].map((item, index) => (
            <div key={item} className="flex min-h-11 items-center justify-between rounded-lg border border-border px-3 py-2 text-sm" data-testid={`journal-sample-symptom-${index + 1}`}>
              <span>{item.split(" · ")[0]}</span><span className="text-muted-foreground">{item.split(" · ")[1]}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="flex justify-start">
        <Button type="button" variant="outline" className="min-h-11" onClick={onDashboard} data-testid="button-journal-dashboard"><LayoutDashboard aria-hidden="true" />Back to Dashboard</Button>
      </div>
      <p className="rounded-lg border border-border bg-secondary p-4 text-sm leading-6" data-testid="journal-fabricated-notice">Made-up entry and made-up symptom values. No health data or journal record is saved.</p>
    </section>
  );
}
