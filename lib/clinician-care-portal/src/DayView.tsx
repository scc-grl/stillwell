import { Link } from 'wouter';
import { ArrowLeft, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { careSymptoms, type CareRoutine } from '@workspace/recovery-journal/clinician-journal';
import { sleepDetails, sleepDurationNote } from '@workspace/recovery-journal';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import { Card } from '@workspace/stillwell-design-system/components/ui/card';
import type { FullJournal } from './queries';
import { longDay, shortIso, timeOf } from './format';

const STATUS: Record<NonNullable<CareRoutine['status']>, string> = {
  done: 'Done',
  not_done: 'Not done',
  not_planned: 'Not planned',
};
const ROUTINE_LABEL: Record<CareRoutine['key'], string> = {
  diet: 'Food & hydration',
  exercise: 'Movement',
  meditation: 'Quiet pause',
};

export function DayView({ data, date }: { data: FullJournal; date: string }) {
  const { journal, entries } = data;
  const base = `/clinician/patients/${journal.linkId}`;
  const index = entries.findIndex((entry) => entry.date === date);
  const entry = index >= 0 ? entries[index] : null;
  // Entries are newest first: the earlier day is the next index.
  const earlier = index >= 0 ? entries[index + 1] : undefined;
  const later = index > 0 ? entries[index - 1] : undefined;
  const name = `${journal.firstName} ${journal.lastName}`.trim();

  return (
    <article className="space-y-6" data-testid="panel-day-view">
      <Link href={base} className="inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="link-back-journal">
        <ArrowLeft className="size-4" aria-hidden="true" /> {name}’s journal
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl" data-testid="text-day-heading">{longDay(date)}</h1>
        <nav aria-label="Other days" className="flex gap-2">
          {earlier ? (
            <Button asChild variant="outline" size="sm"><Link href={`${base}/days/${earlier.date}`} data-testid="link-previous-day"><ChevronLeft aria-hidden="true" /> Previous day</Link></Button>
          ) : <Button variant="outline" size="sm" disabled data-testid="link-previous-day"><ChevronLeft aria-hidden="true" /> Previous day</Button>}
          {later ? (
            <Button asChild variant="outline" size="sm"><Link href={`${base}/days/${later.date}`} data-testid="link-next-day">Next day <ChevronRight aria-hidden="true" /></Link></Button>
          ) : <Button variant="outline" size="sm" disabled data-testid="link-next-day">Next day <ChevronRight aria-hidden="true" /></Button>}
        </nav>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-secondary p-4 text-sm leading-6 text-secondary-foreground" data-testid="banner-day-read-only">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>Patient-reported journal, not a clinical record. Read-only.</p>
      </div>
      {journal.status === 'former' ? (
        <div className="rounded-2xl bg-accent p-4 text-sm leading-6 text-accent-foreground" data-testid="banner-day-former">
          {journal.firstName} stopped sharing on {journal.disconnectedAt ? shortIso(journal.disconnectedAt) : 'the recorded sharing end date'}. You’re seeing entries up to then; nothing new will appear.
        </div>
      ) : null}
      {!entry ? (
        <Card className="p-6 shadow-none" data-testid="status-day-missing">
          <p className="text-foreground">There’s no entry for this day.</p>
        </Card>
      ) : (
        <>
          <section aria-labelledby="day-symptoms" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="day-symptoms" className="font-serif text-2xl font-medium text-foreground">Symptoms</h2>
              <p className="text-xs text-muted-foreground">0 not noticeable · 10 most noticeable</p>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {careSymptoms.map((symptom) => {
                const value = entry.scores[symptom.key];
                return (
                  <li key={symptom.key}>
                    <Card className="flex h-full flex-col gap-2 p-4 shadow-none" data-testid={`tile-symptom-${symptom.key}`}>
                      <span className="text-xs font-semibold text-muted-foreground">{symptom.label}</span>
                      {value === null
                        ? <span className="text-sm text-muted-foreground">Not recorded</span>
                        : <span className="font-serif text-4xl font-medium text-foreground">{value}</span>}
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="day-routines" className="space-y-3">
            <h2 id="day-routines" className="font-serif text-2xl font-medium text-foreground">Routines</h2>
            <ul className="grid gap-3 md:grid-cols-3">
              {entry.routines.map((routine) => (
                <li key={routine.key}>
                  <Card className="h-full space-y-2 p-4 shadow-none" data-testid={`card-routine-${routine.key}`}>
                    <h3 className="text-sm font-semibold text-foreground">{ROUTINE_LABEL[routine.key] ?? routine.label}</h3>
                    <p className="text-sm text-foreground">
                      {routine.status ? STATUS[routine.status] : 'Not recorded'}
                      {routine.minutes !== null && routine.minutes > 0 ? ` · ${routine.minutes} min` : ''}
                    </p>
                    <p className={`text-sm ${routine.note.trim() ? 'text-foreground' : 'text-muted-foreground'}`}>{routine.note.trim() || 'No note'}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="day-sleep" className="space-y-3" data-testid="section-day-sleep">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="day-sleep" className="font-serif text-2xl font-medium text-foreground">Sleep</h2>
              <p className="text-xs text-muted-foreground">Night ending this day</p>
            </div>
            <Card className="space-y-3 p-5 shadow-none">
              <dl className="grid gap-x-6 sm:grid-cols-2">
                {sleepDetails(entry.sleep).map((item) => (
                  <div key={item.label} className="flex items-start justify-between gap-3 border-b border-border py-2 text-sm">
                    <dt className="text-foreground">{item.label}</dt>
                    <dd className={`whitespace-pre-wrap text-right ${item.value === 'Not recorded' ? 'text-muted-foreground' : 'text-foreground'}`}>{item.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs leading-5 text-muted-foreground">{sleepDurationNote}</p>
            </Card>
          </section>

          <Card className="space-y-3 p-5 shadow-none" data-testid="card-day-note">
            <h2 className="font-serif text-2xl font-medium text-foreground">Note</h2>
            {entry.summary.trim() && entry.summary.trim() !== entry.note.trim() ? (
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Check-in summary</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{entry.summary}</p>
              </div>
            ) : null}
            <p className={`whitespace-pre-wrap text-sm leading-6 ${entry.note.trim() ? 'text-foreground' : 'text-muted-foreground'}`}>{entry.note.trim() ? entry.note : 'No note'}</p>
          </Card>

          <p className="text-xs leading-5 text-muted-foreground" data-testid="text-day-footer">
            Patient-reported journal, not a clinical record.{' '}
            {entry.updatedAt
              ? `Last edited by ${journal.firstName} on ${shortIso(entry.updatedAt)} at ${timeOf(entry.updatedAt)}.`
              : 'When this entry was last edited was not recorded.'}
          </p>
        </>
      )}
    </article>
  );
}
