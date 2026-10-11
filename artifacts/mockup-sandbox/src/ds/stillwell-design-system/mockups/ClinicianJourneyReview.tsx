import { useEffect, useMemo, useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import {
  answerLabel,
  baseline,
  exampleEntries,
  exampleToday,
  formatDate,
  isValidDate,
  protocolChoices,
  protocolStart,
  routineLabels,
  scaleLabels,
  symptoms,
  type JourneyEntry,
  type SymptomId,
} from "./_journeyModel";

type SharingScope = { ratings: boolean; routine: boolean; reflections: boolean };

export function ClinicianJourneyReview() {
  const [fromDate, setFromDate] = useState(protocolStart);
  const [toDate, setToDate] = useState(exampleToday);
  const [scope, setScope] = useState<SharingScope>({ ratings: true, routine: true, reflections: true });
  const [selectedDate, setSelectedDate] = useState("2025-02-12");
  const [summary, setSummary] = useState("");
  const validRange = isValidDate(fromDate) && isValidDate(toDate) && fromDate <= toDate && toDate <= exampleToday;
  const hasSharedData = scope.ratings || scope.routine || scope.reflections;

  const visibleEntries = useMemo(
    () => validRange && hasSharedData ? exampleEntries.filter((entry) => entry.date >= fromDate && entry.date <= toDate) : [],
    [fromDate, toDate, validRange, hasSharedData],
  );
  const selectedEntry = exampleEntries.find((entry) => entry.date === selectedDate && visibleEntries.includes(entry)) ?? visibleEntries[visibleEntries.length - 1];
  const latestEntry = visibleEntries[visibleEntries.length - 1];

  function ratingDescription(value: number | undefined) {
    return value === undefined ? "Not recorded" : `${value}/4 · ${scaleLabels[value]}`;
  }

  function buildSummary() {
    if (!hasSharedData) return "Clinician conversation preview · synthetic illustration only\nNo observation types are included in this sharing-scope preview.";
    if (!validRange) return "Clinician conversation preview · synthetic illustration only\nChoose a valid date range before preparing a review.";
    const lines = [
      "Clinician conversation preview · synthetic illustration only",
      `Visible dated entries: ${visibleEntries.length} · ${fromDate} through ${toDate}`,
      "Not a complete daily series. This is a description of recorded observations, not a diagnosis or treatment recommendation.",
      "",
    ];
    if (scope.ratings) {
      lines.push("Recorded ratings");
      for (const item of symptoms.filter(({ id }) => ["headache", "sleep", "attention"].includes(id))) {
        lines.push(`${item.label} · starting snapshot (${formatDate(protocolStart)}): ${ratingDescription(baseline[item.id])} · latest in selected dates (${latestEntry ? formatDate(latestEntry.date) : "none"}): ${ratingDescription(latestEntry?.symptoms[item.id])}`);
      }
      lines.push("Only values actually recorded are shown; missing values remain not recorded.", "");
    }
    if (scope.routine) {
      lines.push("Patient-chosen tracking context");
      lines.push(`Tracked choices: ${protocolChoices.join(", ")}.`);
      lines.push("Cadence: daily on days 1–30 from the chosen start date, then weekly. The logging cadence is not a recovery timeline.");
      lines.push("Exercise milestones are self-paced: observe current capacity; repeat only an already-cleared routine; discuss a possible next step with a clinician.", "");
      lines.push("Visible routine answers");
      for (const entry of visibleEntries) {
        lines.push(`${formatDate(entry.date)} · Food and hydration: ${answerLabel(entry.statuses.food)} · Movement or rest: ${answerLabel(entry.statuses.movement)}`);
        for (const [key, note] of Object.entries(entry.routineNotes ?? {})) {
          if (note?.trim()) lines.push(`${routineLabels[key as keyof typeof routineLabels]} note: ${note}`);
        }
      }
      lines.push("");
    }
    if (scope.reflections) {
      lines.push("Patient words and marked moments");
      for (const entry of visibleEntries) {
        if (entry.reflection) lines.push(`${formatDate(entry.date)} · Reflection: “${entry.reflection}”`);
        if (entry.momentMarked && entry.moment) lines.push(`${formatDate(entry.date)} · Patient-marked meaningful moment: “${entry.moment}”`);
      }
      lines.push("A patient-marked moment is evidence of that person's experience, not proof that a protocol caused improvement.", "");
    }
    return lines.join("\n");
  }

  const sourceSummary = buildSummary();
  useEffect(() => setSummary(sourceSummary), [sourceSummary]);

  function toggleScope(key: keyof SharingScope, checked: boolean) {
    setScope((current) => ({ ...current, [key]: checked }));
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><img src="/__mockup/images/stillwell-logo.png" alt="Stillwell" className="h-9 w-auto" /><span className="text-sm text-muted-foreground">Clinician-review concept · not a live portal</span></div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-muted-foreground">Fixed synthetic example · not connected to a patient</p>
            <Button type="button" variant="outline" size="sm" onClick={() => { window.location.hash = "#/ClinicianPatientDirectory"; }}>All patients</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient portal · synthetic demo</p>
              <h2 className="font-serif text-2xl font-medium tracking-tight">Taylor Bennett</h2>
              <p className="text-sm text-muted-foreground">Demo ID DEMO-1042 · fictional example profile</p>
            </div>
            <div className="rounded-lg bg-muted p-3 sm:max-w-sm">
              <p className="text-sm font-semibold">Patient-shared preview</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">This concept shows only the example observations below. It is not connected to a patient account or live sharing permissions.</p>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">One patient-chosen example journey</p>
          <h1 className="font-serif text-3xl font-medium leading-tight tracking-tight">A careful review of what was recorded</h1>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">Ratings, personal words, and routine choices are kept in their dated context. Illustration only: sparse, non-monotonic records with gaps; no averages, recovery score, prediction, or outcome claim.</p>
        </section>

        <Card>
          <CardHeader><CardTitle>Review context</CardTitle></CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            <div className="grid gap-3 sm:grid-cols-2">
               <label className="space-y-2 text-sm font-medium" htmlFor="review-from">From date<Input id="review-from" type="date" required value={fromDate} aria-invalid={!validRange} max={toDate} onChange={(event) => setFromDate(event.target.value)} /></label>
               <label className="space-y-2 text-sm font-medium" htmlFor="review-through">Through date<Input id="review-through" type="date" required value={toDate} aria-invalid={!validRange} min={fromDate} max={exampleToday} onChange={(event) => setToDate(event.target.value)} /></label>
               {!validRange && <p role="alert" className="text-sm text-destructive sm:col-span-2">Choose valid dates in order, no later than the end of the example journey.</p>}
              <p className="text-sm leading-6 text-muted-foreground sm:col-span-2">Date range changes the visible records and every preview output. Baseline is shown separately for comparison and is not part of the dated check-in count.</p>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Patient-selected sharing scope</h2>
               <p className="text-sm leading-6 text-muted-foreground">Demo controls model the patient's sharing choices. In a real review, the patient—not the clinician—would control permission.</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={scope.ratings} onCheckedChange={(checked) => toggleScope("ratings", checked === true)} />Symptom ratings</label>
                 <label className="flex items-center gap-2 text-sm"><Checkbox checked={scope.routine} onCheckedChange={(checked) => toggleScope("routine", checked === true)} />Routine answers and notes</label>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={scope.reflections} onCheckedChange={(checked) => toggleScope("reflections", checked === true)} />Reflections and marked moments</label>
              </div>
              {!scope.reflections && <p className="text-xs leading-5 text-muted-foreground">Reflections and marked moments are removed from the inspection panel and all summary text while hidden.</p>}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Dated comparison table</CardTitle>
              <p className="text-sm text-muted-foreground">Sparse entries, not a complete daily series. No lines or values are inferred across gaps.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {scope.ratings && <div className="space-y-3">
                 <h2 className="text-sm font-semibold">Starting snapshot · {formatDate(protocolStart)} vs most recent check-in in selected range</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                     <thead><tr className="border-b border-border"><th className="py-2 pr-3 font-semibold">Symptom</th><th className="py-2 pr-3 font-semibold">Starting snapshot</th><th className="py-2 font-semibold">Most recent check-in{latestEntry ? ` · ${formatDate(latestEntry.date)}` : ""}</th></tr></thead>
                    <tbody>{(["headache", "sleep", "attention"] as SymptomId[]).map((id) => <tr key={id} className="border-b border-border"><th scope="row" className="py-2 pr-3 font-medium">{symptoms.find((item) => item.id === id)?.label}</th><td className="py-2 pr-3">{ratingDescription(baseline[id])}</td><td className="py-2">{ratingDescription(latestEntry?.symptoms[id])}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>}

              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Recorded history · {visibleEntries.length} dated entries in range</h2>
                {!visibleEntries.length
                  ? <div className="space-y-2 rounded-lg bg-muted p-4"><p className="text-sm font-semibold">No dated entries in this range.</p><p className="text-sm leading-6 text-muted-foreground">Widen the date range to include recorded example dates. No records are created to fill a gap.</p></div>
                  : <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead><tr className="border-b border-border"><th className="py-2 pr-3 font-semibold">Date · cadence</th>{scope.ratings && <><th className="py-2 pr-3 font-semibold">Headache</th><th className="py-2 pr-3 font-semibold">Sleep</th><th className="py-2 pr-3 font-semibold">Attention</th></>}{scope.routine && <><th className="py-2 pr-3 font-semibold">Food</th><th className="py-2 font-semibold">Movement/rest</th></>}</tr></thead>
                      <tbody>{visibleEntries.map((entry) => <tr key={entry.date} className="border-b border-border">
                        <th scope="row" className="py-2 pr-3 font-medium">{formatDate(entry.date)}<span className="block text-xs font-normal text-muted-foreground">{entry.cadence}</span></th>
                        {scope.ratings && <>{(["headache", "sleep", "attention"] as SymptomId[]).map((id) => <td key={id} className="py-2 pr-3">{ratingDescription(entry.symptoms[id])}</td>)}</>}
                        {scope.routine && <><td className="py-2 pr-3">{answerLabel(entry.statuses.food)}</td><td className="py-2">{answerLabel(entry.statuses.movement)}</td></>}
                      </tr>)}</tbody>
                    </table>
                  </div>}
                {scope.ratings && <p className="text-xs leading-5 text-muted-foreground">“Not recorded” is not zero. For example, February 12 has no recorded headache value. The dates shown do not represent every day.</p>}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Inspect a dated entry</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {visibleEntries.map((entry) => <Button key={entry.date} type="button" size="sm" variant={selectedEntry?.date === entry.date ? "default" : "outline"} aria-pressed={selectedEntry?.date === entry.date} onClick={() => setSelectedDate(entry.date)}>{formatDate(entry.date)}</Button>)}
                </div>
                {selectedEntry
                  ? <article className="space-y-3 border-t border-border pt-4">
                    <h2 className="text-base font-semibold">{formatDate(selectedEntry.date)} · {selectedEntry.cadence} check-in</h2>
                    {scope.ratings && <div className="space-y-1">{(["headache", "sleep", "attention"] as SymptomId[]).map((id) => <p key={id} className="text-sm">{symptoms.find((item) => item.id === id)?.label}: <span className="text-muted-foreground">{ratingDescription(selectedEntry.symptoms[id])}</span></p>)}</div>}
                     {scope.routine && <div className="space-y-1 border-t border-border pt-3"><p className="text-sm">Food and hydration: <span className="text-muted-foreground">{answerLabel(selectedEntry.statuses.food)}</span></p><p className="text-sm">Movement or rest: <span className="text-muted-foreground">{answerLabel(selectedEntry.statuses.movement)}</span></p>{Object.entries(selectedEntry.routineNotes ?? {}).map(([key, note]) => note?.trim() && <p key={key} className="whitespace-pre-wrap text-sm text-muted-foreground">{routineLabels[key as keyof typeof routineLabels]} note: {note}</p>)}</div>}
                    {scope.reflections && <div className="space-y-2 border-t border-border pt-3">
                      <h3 className="text-sm font-semibold">Patient words · reflection</h3>
                      <blockquote className="border-l-2 border-border pl-3 text-sm leading-6">“{selectedEntry.reflection || "No reflection recorded."}”</blockquote>
                      <p className="text-xs leading-5 text-muted-foreground">Source: patient-entered reflection in this synthetic check-in; dated {formatDate(selectedEntry.date)}.</p>
                      {selectedEntry.momentMarked && selectedEntry.moment && <div className="space-y-1 rounded-lg bg-muted p-3"><p className="text-xs font-semibold uppercase tracking-wider">Patient-marked meaningful moment</p><p className="text-sm leading-6">“{selectedEntry.moment}”</p><p className="text-xs leading-5 text-muted-foreground">Patient-marked account of experience; not evidence that a protocol caused improvement.</p></div>}
                    </div>}
                    {!scope.reflections && <p className="text-sm text-muted-foreground">Patient reflections and marked moments are not included in the selected sharing scope.</p>}
                  </article>
                  : <p className="text-sm text-muted-foreground">No dated entry is selected for this range.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Editable review summary · preview only</CardTitle><p className="text-sm text-muted-foreground">Prepared from visible records and current patient-chosen scope. Edit before any imagined conversation; nothing is sent or saved.</p></CardHeader>
              <CardContent className="space-y-3">
                <Textarea aria-label="Editable clinician review summary" value={summary} onChange={(event) => setSummary(event.target.value)} />
                <p className="text-xs leading-5 text-muted-foreground">Changing dates or scope refreshes this draft from the selected visible facts. No AI-generated content or additional evidence is represented.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-3 pt-5">
            <h2 className="text-sm font-semibold">Protocol choices in context</h2>
            {scope.routine ? <p className="text-sm leading-6">The illustration begins {formatDate(protocolStart)}. Daily check-ins are the default for days 1–30; weekly thereafter. The person chose to notice meals, fluids, rest, and an already-cleared walk. Three self-paced milestones are visible: observe, repeat only something already cleared, and review a possible next step with a clinician. None is a prescribed progression.</p> : <p className="text-sm text-muted-foreground">The patient's routine choices and answers are not included in this sharing-scope preview.</p>}
            <p className="text-sm leading-6 text-muted-foreground">Patient-marked ability and symptom ratings describe this person's experience; they do not establish that a protocol caused improvement. Example dates and quotes are synthetic, consistent with the companion phone design, and are not a complete daily series.</p>
            <p className="text-xs leading-5 text-muted-foreground">Any future research use would require separate consent. This concept does not enroll participants or implement sharing.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
