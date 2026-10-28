import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { CloudOff, Info } from 'lucide-react';
import {
  careSymptoms,
  filterCareEntries,
  type CareRange,
  type ClinicalEntry,
} from '@workspace/recovery-journal/clinician-journal';
import { sleepDurationMinutes, sleepDurationLabel } from '@workspace/recovery-journal';
import { Badge } from '@workspace/stillwell-design-system/components/ui/badge';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import { Card } from '@workspace/stillwell-design-system/components/ui/card';
import { Skeleton } from '@workspace/stillwell-design-system/components/ui/skeleton';
import type { FullJournal } from './queries';
import { SymptomTable } from './SymptomTable';
import { RemoveFormerButton } from './RemoveDialog';
import { focusLabels, isoToDay, localToday, relativeDay, rowDay, shortDay, shortIso, supportLabel } from './format';

const PAGE = 20;
const RANGES: { value: CareRange; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 'all', label: 'All' },
];

export function JournalSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading journal" data-testid="status-journal-loading">
      <Skeleton className="h-10 w-64 rounded-xl" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-72 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

export function JournalError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="flex flex-col items-start gap-4 p-6 shadow-none" data-testid="status-journal-error">
      <CloudOff className="size-6 text-muted-foreground" aria-hidden="true" />
      <p role="alert" className="text-foreground">Couldn’t load this journal.</p>
      <Button onClick={onRetry} data-testid="button-journal-retry">Try again</Button>
    </Card>
  );
}

function entrySummary(entry: ClinicalEntry): string {
  const parts: string[] = [];
  const recorded = careSymptoms
    .map((symptom): { label: string; value: number | null } => ({ label: symptom.label, value: entry.scores[symptom.key] }))
    .filter((item): item is { label: string; value: number } => item.value !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);
  recorded.forEach((item) => parts.push(`${item.label} ${item.value}`));
  const done = entry.routines.filter((routine) => routine.status === 'done').length;
  if (done) parts.push(`${done} routine${done === 1 ? '' : 's'}`);
  if (entry.sleep) parts.push(sleepDurationMinutes(entry.sleep) !== null ? `sleep ${sleepDurationLabel(entry.sleep)}` : 'sleep');
  parts.push(`Worse with activity: ${entry.activityAnswer}`);
  if (entry.note.trim() || entry.summary.trim()) parts.push('note');
  return parts.length ? parts.join(' · ') : 'Nothing recorded';
}

function EntryList({ linkId, entries }: { linkId: string; entries: ClinicalEntry[] }) {
  const [shown, setShown] = useState(PAGE);
  if (!entries.length) return <p className="text-sm text-muted-foreground">No entries yet.</p>;
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border">
        {entries.slice(0, shown).map((entry) => (
          <li key={entry.date}>
            <Link href={`/clinician/patients/${linkId}/days/${entry.date}`}
              className="flex min-h-12 flex-wrap items-center gap-x-2 rounded-xl px-2 py-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid={`link-day-${entry.date}`}>
              <span className="font-semibold text-foreground">{rowDay(entry.date)}</span>
              <span className="text-muted-foreground">· {entrySummary(entry)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {shown < entries.length ? (
        <Button variant="outline" onClick={() => setShown((n) => n + PAGE)} data-testid="button-load-older">Load older</Button>
      ) : null}
    </div>
  );
}

export function PatientJournal({ data, onRemoved }: { data: FullJournal; onRemoved: () => void }) {
  const { journal, entries } = data;
  const former = journal.status === 'former';
  const [range, setRange] = useState<CareRange>(30);
  const fullName = `${journal.firstName} ${journal.lastName}`.trim();
  const from = shortIso(journal.connectedAt);
  const to = journal.disconnectedAt ? shortIso(journal.disconnectedAt) : 'now';
  const anchor = former && journal.disconnectedAt ? isoToDay(journal.disconnectedAt) : localToday();
  const ranged = useMemo(() => former ? entries : filterCareEntries(entries, range, anchor), [entries, former, range, anchor]);
  const support = supportLabel(journal.supportApproach);
  const focus = focusLabels(journal.focusAreas);

  return (
    <article className="min-w-0 space-y-6" data-testid="panel-patient-journal">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl" data-testid="text-patient-name">{fullName}</h1>
          {former ? <Badge variant="outline" data-testid="badge-former">Former patient</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground" data-testid="text-patient-meta">
          {former
            ? `Shared ${from} – ${to} · read-only`
            : [
                `Connected ${from}`,
                journal.lastUpdated ? `last updated ${relativeDay(isoToDay(journal.lastUpdated))}` : 'no updates yet',
                support,
              ].filter(Boolean).join(' · ')}
        </p>
        {!former && focus.length ? (
          <ul className="flex flex-wrap gap-2" aria-label="Routine focus areas">
            {focus.map((label) => <li key={label}><Badge variant="secondary">{label}</Badge></li>)}
          </ul>
        ) : null}
      </header>

      {former ? (
        <div className="flex items-start gap-3 rounded-2xl bg-accent p-4 text-sm leading-6 text-accent-foreground" data-testid="banner-former">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{journal.firstName} stopped sharing on {to}. You’re seeing entries up to then; nothing new will appear. Patient-reported, not a clinical record.</p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl bg-secondary p-4 text-sm leading-6 text-secondary-foreground" data-testid="banner-read-only">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Patient-reported journal, not a clinical record. Read-only.</p>
        </div>
      )}

      <Card className="min-w-0 space-y-4 overflow-hidden p-4 shadow-none md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl font-medium text-foreground">{former ? 'Shared period' : 'Symptoms'}</h2>
          {!former ? (
            <div role="group" aria-label="Range" className="flex flex-wrap gap-2">
              {RANGES.map((option) => (
                <Button key={String(option.value)} size="sm" variant={range === option.value ? 'default' : 'outline'}
                  aria-pressed={range === option.value} onClick={() => setRange(option.value)} data-testid={`button-range-${option.value}`}>
                  {option.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
        <SymptomTable entries={ranged} former={former}
          trendColumn={former ? 'Shared period' : 'Trend'} latestColumn={former ? 'Last shared' : 'Latest'} />
        {!ranged.length && entries.length ? (
          <p className="text-sm text-muted-foreground">No entries in this range. The most recent entry is from {shortDay(entries[0].date)}.</p>
        ) : null}
      </Card>

      <Card className="min-w-0 space-y-4 overflow-hidden p-4 shadow-none md:p-6">
        <h2 className="font-serif text-2xl font-medium text-foreground">{former ? 'Shared entries' : 'Daily entries'}</h2>
        <EntryList key={journal.linkId} linkId={journal.linkId} entries={entries} />
      </Card>

      {former ? (
        <RemoveFormerButton linkId={journal.linkId} fullName={fullName} firstName={journal.firstName} from={from} to={to} onRemoved={onRemoved} />
      ) : null}
    </article>
  );
}
