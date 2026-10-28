import type { RecoveryLog } from "@workspace/api-client-react";
import {
  formatDate,
  sleepDetails,
  sleepDurationNote,
  sleepWeek,
  type SleepLog,
} from "@workspace/recovery-journal";

/** Read-only sleep fields for one day, with "Not recorded" for skipped fields. */
export function SleepDetailList({ sleep }: { sleep?: SleepLog | null }) {
  if (!sleep) return <p className="text-sm text-muted-foreground">Not recorded</p>;
  return <div className="space-y-2">
    <dl className="grid gap-x-4 sm:grid-cols-2">
      {sleepDetails(sleep).map((item) => <div key={item.label} className="flex items-start justify-between gap-3 border-b border-border py-2 text-sm">
        <dt>{item.label}</dt><dd className="whitespace-pre-wrap text-right text-muted-foreground">{item.value}</dd>
      </div>)}
    </dl>
    <p className="text-xs leading-5 text-muted-foreground">{sleepDurationNote}</p>
  </div>;
}

/** Seven calendar days of calculated hours and quality. No scores or targets. */
export function SleepWeekTable({ logs, ending }: { logs: readonly RecoveryLog[]; ending: string }) {
  return <div className="space-y-2">
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Sleep over the last seven days</caption>
      <thead><tr className="border-b border-border text-xs text-muted-foreground"><th scope="col" className="py-2 font-medium">Night ending</th><th scope="col" className="py-2 font-medium">Hours</th><th scope="col" className="py-2 font-medium">Quality</th></tr></thead>
      <tbody>{sleepWeek(logs, ending).map((day) => <tr key={day.date} className="border-b border-border last:border-0">
        <th scope="row" className="py-2 font-medium">{formatDate(day.date)}</th>
        <td className="py-2 text-muted-foreground">{day.duration}</td>
        <td className="py-2 text-muted-foreground">{day.quality}</td>
      </tr>)}</tbody>
    </table>
    <p className="text-xs leading-5 text-muted-foreground">{sleepDurationNote}</p>
  </div>;
}

