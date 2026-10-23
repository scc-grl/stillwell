import { useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import stillwellMark from "@workspace/stillwell-design-system/brand/stillwell-mark.svg";
import { ArrowRight, CircleAlert, ClipboardList, HeartHandshake, NotebookPen, ShieldCheck } from "lucide-react";
import {
  PatientProgressDaybook,
  PatientWorkspaceNavigation,
  type PatientWorkspaceView,
} from "../stillwell-progress-atlas/PatientProgressDaybook";

function SafetyNote() {
  return <Card>
    <CardContent className="flex gap-3 p-4 text-sm leading-6">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent-foreground" />
      <p><strong className="font-semibold">A safety note.</strong> Stillwell is not for a new injury or emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.</p>
    </CardContent>
  </Card>;
}

function DashboardHome({ onNavigate }: { onNavigate: (view: PatientWorkspaceView) => void }) {
  const today = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  return <div className="space-y-6">
    <section className="grid gap-5 lg:grid-cols-2">
      <section className="flex min-h-60 flex-col justify-between gap-6 rounded-xl bg-primary p-6 text-primary-foreground sm:p-8" aria-labelledby="dashboard-heading">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Your space, your pace</p>
          <h1 id="dashboard-heading" className="mt-3 max-w-xl font-serif text-4xl font-medium leading-tight sm:text-5xl">Make room for what today is.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 opacity-90">A personal place to notice your days and return to what you chose to record.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm opacity-80">{today}</p>
          <Button variant="secondary" onClick={() => onNavigate("journal")}>Open your journal <ArrowRight aria-hidden="true" /></Button>
        </div>
      </section>

      <Card>
        <CardHeader className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your journal</p>
          <CardTitle className="mt-2 font-serif text-2xl font-medium">Patterns, in your own words.</CardTitle>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Your saved check-ins appear in date order. Choose any day to revisit the responses and note you recorded.</p>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="rounded-lg bg-secondary p-4">
            <p className="flex items-center gap-2 text-sm font-medium"><NotebookPen aria-hidden="true" className="size-4 text-primary" />Journal daybook</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Browse one saved day at a time. Entries are not filled in between days.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => onNavigate("journal")}>View journal <ArrowRight aria-hidden="true" /></Button>
        </CardContent>
      </Card>
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your chosen routine</p>
          <CardTitle className="mt-2 font-serif text-2xl font-medium">A plan that can change with you.</CardTitle>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Review the routine choices you want to keep. This is a reflection tool, not a treatment plan.</p>
        </CardHeader>
        <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
          <Button type="button" variant="outline" onClick={() => onNavigate("care-protocol")}><ClipboardList aria-hidden="true" />Open care protocol</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your care team</p>
          <CardTitle className="mt-2 flex items-center gap-2 font-serif text-2xl font-medium"><HeartHandshake aria-hidden="true" className="size-5 text-primary" />Your journal stays yours.</CardTitle>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">You choose whether to share your journal with a clinician. Nothing is shared unless you invite someone or accept their request.</p>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="rounded-lg bg-secondary p-4 text-sm leading-6 text-muted-foreground">Care team connections are not active in this design preview.</p>
          <Button type="button" variant="outline" onClick={() => onNavigate("care-team")}>View care team <ArrowRight aria-hidden="true" /></Button>
        </CardContent>
      </Card>
    </section>

    <SafetyNote />
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="size-4" />No streaks. No prescribed progression.</span>
      <span>Design preview only · not connected to records</span>
    </footer>
  </div>;
}

function PlaceholderPage({ view, onNavigate }: { view: Exclude<PatientWorkspaceView, "dashboard" | "journal">; onNavigate: (view: PatientWorkspaceView) => void }) {
  const page = {
    "care-protocol": {
      eyebrow: "Your chosen routine",
      title: "Build a plan around what matters to you.",
      description: "Choose optional reflections for food and hydration, movement, quiet pauses, and pacing. Keep, change, or skip any part.",
      note: "Educational routines only. This preview does not offer supplement doses or exercise prescriptions.",
    },
    "care-team": {
      eyebrow: "Your care team",
      title: "You decide what to share.",
      description: "You can choose to invite a clinician you know or respond to a request. Sharing and clinician connections are not active in this preview.",
      note: "Any future sharing is read-only and starts only after you choose.",
    },
    account: {
      eyebrow: "Your account",
      title: "Your privacy controls belong here.",
      description: "Review your account and journal settings in this patient workspace. This design preview is not connected to a sign-in session.",
      note: "The clinician portal is separate. This page does not show clinician or patient records.",
    },
  }[view];

  return <div className="mx-auto max-w-3xl space-y-5">
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{page.eyebrow}</p>
      <h1 className="mt-2 font-serif text-4xl font-medium leading-tight">{page.title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{page.description}</p>
    </section>
    <Card>
      <CardContent className="space-y-4 p-6 sm:p-8">
        <p className="text-sm leading-6 text-muted-foreground">{page.note}</p>
        <Button type="button" variant="outline" onClick={() => onNavigate("journal")}><NotebookPen aria-hidden="true" />Return to journal</Button>
      </CardContent>
    </Card>
  </div>;
}

export default function PatientDashboardJournal() {
  const [view, setView] = useState<PatientWorkspaceView>("dashboard");

  return <main className="min-h-[100dvh] bg-background text-foreground">
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <img src={stillwellMark} alt="" aria-hidden="true" className="size-9 shrink-0" />
          <span className="font-serif text-xl font-semibold tracking-tight">stillwell</span>
        </div>
        <p className="hidden text-xs text-muted-foreground xl:block">A quiet place for your own reflections</p>
        <PatientWorkspaceNavigation active={view} onNavigate={setView} />
      </div>
    </header>

    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      {view === "dashboard"
        ? <DashboardHome onNavigate={setView} />
        : view === "journal"
          ? <PatientProgressDaybook embedded />
          : <PlaceholderPage view={view} onNavigate={setView} />}
    </div>
  </main>;
}
