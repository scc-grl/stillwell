import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import type { RecoveryLogInput, RecoveryPreferences } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import { ShieldCheck } from "lucide-react";
import { ActivitiesEditor } from "@/components/ActivitiesEditor";
import { DailyCheckInFlow } from "@/components/DailyCheckInFlow";
import { clearDraft, emptyLog, writeDraft } from "@/lib/recovery";
import { localDate, setupCopy, supportModes, defaultSymptoms, type CheckInSymptomName } from "@workspace/recovery-journal";

export default function QuizPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [, setLocation] = useLocation();
  const [firstLog, setFirstLog] = useState<RecoveryLogInput>(() => emptyLog(localDate()));
  const [supportMode, setSupportMode] = useState<RecoveryPreferences["supportMode"]>("self_guided");
  const [selectedSymptoms, setSelectedSymptoms] = useState<CheckInSymptomName[]>(defaultSymptoms);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [editingActivities, setEditingActivities] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const ownerId = isSignedIn ? user?.id ?? null : null;

  function saveStartingSummary() {
    setError("");
    if (!consentAccepted) {
      setError("Please agree to store this setup in your private journal.");
      return;
    }
    setSaving(true);
    try {
      writeDraft({
        preferences: { supportMode, priorities: [], selectedSymptoms },
        consentAccepted: true,
        firstLog: { ...firstLog, date: localDate() },
      }, ownerId);
      setLocation(isSignedIn ? "/dashboard" : "/sign-up");
    } catch {
      setError("Your setup could not be saved yet. It remains on this page so you can retry or clear it.");
      setSaving(false);
    }
  }

  function cancelSetup() {
    clearDraft();
    setLocation(isSignedIn ? "/dashboard" : "/");
  }

  if (!isLoaded) return <main className="min-h-[100dvh] bg-background p-6"><Card className="mx-auto h-12 max-w-3xl animate-pulse bg-muted" aria-label="Loading setup" /></main>;

  return <main className="min-h-[100dvh] bg-background px-4 pb-10 pt-5 sm:px-8">
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-3">
      <Link href="/" className="flex items-center gap-3 text-foreground" aria-label="Stillwell home"><span className="brand-mark" /><span className="font-serif text-xl font-semibold tracking-tight">stillwell</span></Link>
      <Link href="/privacy" className="inline-flex items-center gap-2 text-xs text-muted-foreground underline underline-offset-4"><ShieldCheck className="size-4" />Privacy &amp; data controls</Link>
    </header>

    <div className="mx-auto mt-8 max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">A starting point</p>
        <h1 className="font-serif text-4xl font-medium leading-tight">{setupCopy.title}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{setupCopy.intro}</p>
      </div>

      <Card className="space-y-5 p-5 sm:p-8">
        {editingActivities
          ? <ActivitiesEditor
              initial={firstLog}
              onChange={setFirstLog}
              onCancel={() => setEditingActivities(false)}
              cancelLabel="Back to your first summary"
            />
          : <DailyCheckInFlow
              key="first-daily-summary"
              initial={firstLog}
              logs={[]}
              today={localDate()}
              startAt={firstLog.dailyCheckIn ? "saved" : "home"}
              draftMode
              selectedSymptoms={selectedSymptoms}
              onSelectSymptoms={setSelectedSymptoms}
              onDraftChange={setFirstLog}
              onDraftComplete={setFirstLog}
              onEditActivities={() => setEditingActivities(true)}
            />}
      </Card>

      <Card className="space-y-4 bg-secondary p-5 sm:p-6">
        <div>
          <h2 id="recovery-track-heading" className="font-serif text-2xl font-medium">Choose your recovery track</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Keep a journal for yourself or alongside support from a clinician. You can change this later.</p>
        </div>
        <div className="space-y-2" role="radiogroup" aria-labelledby="recovery-track-heading">
          {supportModes.map((mode) => <label key={mode.value} className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-muted/60">
            <Checkbox
              checked={supportMode === mode.value}
              onCheckedChange={() => setSupportMode(mode.value)}
              aria-label={mode.title}
              role="radio"
              aria-checked={supportMode === mode.value}
            />
            <span><span className="block text-sm font-medium">{mode.title}</span><span className="text-xs leading-5 text-muted-foreground">{mode.detail}</span></span>
          </label>)}
        </div>
        {supportMode === "clinician_supported" && <Card className="space-y-2 p-4">
          <h3 className="text-sm font-semibold">Clinician support is not available in Stillwell yet</h3>
          <p className="text-xs leading-5 text-muted-foreground">In-app invitations and journal sharing are planned, but are not available yet. You can choose to bring your own reflections to a clinician outside Stillwell.</p>
        </Card>}
      </Card>

      <Card className="p-5">
        <label className="flex cursor-pointer items-start gap-3">
        <Checkbox
          checked={consentAccepted}
          onCheckedChange={(checked) => { setConsentAccepted(checked === true); setError(""); }}
          aria-label="Storage consent"
          data-testid="storage-consent"
        />
        <span>
          <span className="block text-sm leading-6">{setupCopy.consent}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{setupCopy.consentDetail}</span>
        </span>
        </label>
      </Card>

      <Card className="space-y-2 bg-secondary p-4" aria-label="Care boundary">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">A note on care</p>
        <p className="text-sm leading-6">Not for a new injury or an emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.</p>
      </Card>

      {error && <Card role="alert" className="border-destructive p-3 text-sm text-destructive">{error}</Card>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={cancelSetup}>Cancel and clear this setup</Button>
        <Button onClick={saveStartingSummary} disabled={saving || !consentAccepted} data-testid="save-starting-summary">
          {saving ? "Saving…" : isSignedIn ? "Save my starting summary" : "Agree and create my account"}
        </Button>
      </div>
    </div>
  </main>;
}
