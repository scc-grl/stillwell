import { useMemo, useState } from 'react';
import {
  careSymptomStats,
  careSymptoms,
  type CareSymptomKey,
  type ClinicalEntry,
} from '@workspace/recovery-journal/clinician-journal';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/stillwell-design-system/components/ui/table';
import { shortDay } from './format';

type Point = { date: string; value: number | null };

/** Splits a series at missing days so gaps are drawn as gaps, never bridged or smoothed. */
function segments(points: Point[], width: number, height: number): string[] {
  if (!points.length) return [];
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const out: string[] = [];
  let current: string[] = [];
  points.forEach((point, index) => {
    if (point.value === null) {
      if (current.length) out.push(current.join(' '));
      current = [];
      return;
    }
    const x = points.length > 1 ? index * step : width / 2;
    const y = height - (point.value / 10) * height;
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (current.length) out.push(current.join(' '));
  return out;
}

function Trend({ points }: { points: Point[] }) {
  const lines = segments(points, 120, 28);
  return (
    <svg viewBox="-3 -3 126 34" className="h-8 w-32 text-primary" aria-hidden="true" focusable="false">
      {lines.map((line) => line.includes(' ')
        ? <polyline key={line} points={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        : <circle key={line} cx={line.split(',')[0]} cy={line.split(',')[1]} r="2.5" fill="currentColor" />)}
    </svg>
  );
}

const LINE_COLORS = ['text-chart-1', 'text-chart-2', 'text-chart-3', 'text-chart-4', 'text-chart-5', 'text-primary', 'text-accent-foreground'];
const DASHES = [undefined, undefined, undefined, undefined, undefined, '6 4', '2 3'];

function CombinedChart({ series }: { series: { key: CareSymptomKey; label: string; points: Point[] }[] }) {
  return (
    <figure className="space-y-3" aria-hidden="true" data-testid="chart-combined">
      <svg viewBox="-4 -4 608 168" className="h-48 w-full" focusable="false" preserveAspectRatio="none">
        {[0, 5, 10].map((tick) => (
          <line key={tick} x1="0" x2="600" y1={160 - tick * 16} y2={160 - tick * 16} className="text-border" stroke="currentColor" strokeWidth="1" />
        ))}
        {series.map((item, index) => segments(item.points, 600, 160).map((line) => line.includes(' ')
          ? <polyline key={`${item.key}-${line}`} points={line} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={DASHES[index]} className={LINE_COLORS[index]} vectorEffect="non-scaling-stroke" />
          : <circle key={`${item.key}-${line}`} cx={line.split(',')[0]} cy={line.split(',')[1]} r="3" fill="currentColor" className={LINE_COLORS[index]} />))}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {series.map((item, index) => (
          <span key={item.key} className="inline-flex items-center gap-2">
            <svg viewBox="0 0 16 4" className={`h-1 w-4 ${LINE_COLORS[index]}`} focusable="false">
              <line x1="0" x2="16" y1="2" y2="2" stroke="currentColor" strokeWidth="4" strokeDasharray={DASHES[index]} />
            </svg>
            {item.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export function SymptomTable({ entries, former, latestColumn, trendColumn }: {
  entries: ClinicalEntry[];
  former: boolean;
  latestColumn: string;
  trendColumn: string;
}) {
  const [combined, setCombined] = useState(false);
  const rows = useMemo(() => careSymptoms.map((symptom) => ({ ...symptom, stats: careSymptomStats(entries, symptom.key) })), [entries]);
  const newest = entries[0]?.date ?? null;
  const hasData = rows.some((row) => row.stats.latest !== null);

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground" id="symptom-scale">0 not noticeable · 10 most noticeable</p>
        {hasData ? (
          <Button variant="outline" aria-pressed={combined} onClick={() => setCombined((value) => !value)} data-testid="button-toggle-combined">
            Show as one combined chart
          </Button>
        ) : null}
      </div>
      {combined && hasData ? <CombinedChart series={rows.map((row) => ({ key: row.key, label: row.label, points: row.stats.points }))} /> : null}
      <Table aria-describedby="symptom-scale" className="min-w-0 table-fixed text-xs sm:table-auto sm:text-sm [&_td]:px-1 [&_th]:px-1 sm:[&_td]:px-2 sm:[&_th]:px-2 [&_td]:break-words [&_th]:break-words" data-testid="table-symptoms">
        <TableCaption className="sr-only">{former ? 'Symptoms over the shared period' : 'Symptoms over the selected range'}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Symptom</TableHead>
            <TableHead scope="col" className="hidden sm:table-cell">{trendColumn}</TableHead>
            <TableHead scope="col">{latestColumn}</TableHead>
            <TableHead scope="col">Range</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ key, label, stats }) => (
            <TableRow key={key} data-testid={`row-symptom-${key}`}>
              <TableHead scope="row" className="h-auto py-2 font-semibold text-foreground">{label}</TableHead>
              <TableCell className="hidden sm:table-cell"><Trend points={stats.points} /></TableCell>
              <TableCell>
                {stats.latest === null ? <span className="text-muted-foreground">Not recorded</span> : (
                  <span>
                    <span className="font-semibold text-foreground">{stats.latest}</span>
                    {stats.latestDate && stats.latestDate !== newest ? <span className="text-xs text-muted-foreground"> · {shortDay(stats.latestDate)}</span> : null}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {stats.min === null || stats.max === null
                  ? <span className="text-muted-foreground">Not recorded</span>
                  : stats.min === stats.max ? String(stats.min) : `${stats.min}–${stats.max}`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
