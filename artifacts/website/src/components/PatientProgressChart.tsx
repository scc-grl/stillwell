import { useState } from "react";
import type { RecoveryLog } from "@workspace/api-client-react";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import {
  checkInSymptoms,
  dailyCheckInFromLog,
  formatDayNumber,
  formatWeekday,
  overallChoices,
  ratingChoices,
  weekDates,
  weeklyInsight,
} from "@workspace/recovery-journal";

type Metric = "overall" | (typeof checkInSymptoms)[number]["name"];

const metricOptions: { value: Metric; label: string }[] = [
  { value: "overall", label: "Overall feeling" },
  ...checkInSymptoms.map((symptom) => ({ value: symptom.name, label: symptom.label })),
];

function valueFor(log: RecoveryLog, metric: Metric): number | null {
  const checkIn = dailyCheckInFromLog(log);
  if (metric === "overall") {
    const index = overallChoices.findIndex((choice) => choice.value === checkIn.overallFeeling);
    return index >= 0 ? index : null;
  }
  const answer = checkIn.symptoms.find((item) => item.name === metric);
  return answer?.status === "recorded" && answer.rating !== null ? answer.rating : null;
}

export function PatientProgressChart({ logs, today }: { logs: readonly RecoveryLog[]; today: string }) {
  const [metric, setMetric] = useState<Metric>("overall");
  const dates = weekDates(today);
  const entries = new Map(logs.map((log) => [log.date, log]));
  const currentMetric = metricOptions.find((option) => option.value === metric)!;
  const isOverall = metric === "overall";
  const minimumLabel = isOverall ? overallChoices[0].label : ratingChoices[0].label;
  const maximumLabel = isOverall ? overallChoices[overallChoices.length - 1].label : ratingChoices[ratingChoices.length - 1].label;
  const maximum = isOverall ? overallChoices.length - 1 : ratingChoices.length - 1;
  const points = dates.map((date, index) => {
    const log = entries.get(date);
    const value = log ? valueFor(log, metric) : null;
    return {
      date,
      day: formatWeekday(date),
      number: formatDayNumber(date),
      x: 42 + index * 61,
      y: value === null ? null : 114 - (value / maximum) * 88,
    };
  });
  const segments: typeof points[] = [];
  let currentSegment: typeof points = [];
  for (const point of points) {
    if (point.y === null) {
      if (currentSegment.length) segments.push(currentSegment);
      currentSegment = [];
    } else {
      currentSegment.push(point);
    }
  }
  if (currentSegment.length) segments.push(currentSegment);
  const hasValues = segments.length > 0;
  const insight = weeklyInsight(logs, today);

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your recent check-ins</p>
          <h2 className="mt-2 font-serif text-2xl font-medium">A little perspective</h2>
          <p className="mt-1 text-sm text-muted-foreground">Only the entries you chose to save are shown.</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="progress-metric" className="text-xs font-medium text-muted-foreground">View</label>
          <select
            id="progress-metric"
            className="min-h-11 min-w-40 rounded-full border border-input bg-background px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={metric}
            onChange={(event) => setMetric(event.target.value as Metric)}
            data-testid="select-progress-metric"
          >
            {metricOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-xl bg-secondary/60 p-3 sm:p-4">
        <div className="mb-2 flex justify-between gap-3 text-xs text-muted-foreground" aria-hidden="true">
          <span>{minimumLabel}</span>
          <span>{maximumLabel}</span>
        </div>
        <svg
          viewBox="0 0 410 132"
          className="h-40 w-full"
          role="img"
          aria-label={`${currentMetric.label} across the last seven days, shown only for days with a saved response. ${minimumLabel} to ${maximumLabel}.`}
          data-testid="chart-patient-progress"
        >
          {[26, 55, 84, 114].map((y) => <line key={y} x1="32" x2="398" y1={y} y2={y} stroke="hsl(var(--border))" strokeDasharray="3 5" />)}
          {segments.filter((segment) => segment.length > 1).map((segment, index) => (
            <polyline
              key={index}
              points={segment.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="hsl(var(--chart-1))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {points.filter((point) => point.y !== null).map((point) => (
            <circle key={point.date} cx={point.x} cy={point.y!} r="5" fill="hsl(var(--card))" stroke="hsl(var(--chart-1))" strokeWidth="3" />
          ))}
        </svg>
        <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground">
          {points.map((point) => <div key={point.date} className="flex flex-col gap-1">
            <span>{point.day}</span>
            <span className={point.y === null ? "" : "font-medium text-foreground"}>{point.number}</span>
          </div>)}
        </div>
        {!hasValues && <p className="mt-4 rounded-lg bg-background/70 p-4 text-center text-sm text-muted-foreground">Your saved check-ins will appear here. No example entries are used.</p>}
      </div>

      <p className="text-sm leading-6 text-muted-foreground">This shows what you recorded, not a diagnosis or a judgment about how recovery should progress.</p>
      {insight && <p className="rounded-xl border border-border bg-muted/50 p-4 text-sm leading-6" data-testid="text-weekly-pattern">
        <span className="font-medium">{insight}</span>
        <span className="mt-1 block text-xs text-muted-foreground">A pattern to notice, not a diagnosis.</span>
      </p>}
    </Card>
  );
}
