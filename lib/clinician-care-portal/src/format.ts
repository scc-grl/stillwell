/** Calendar dates (YYYY-MM-DD) are read as local days, never shifted through UTC. */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Calendar date of an ISO timestamp in the reader's time zone. */
export function isoToDay(iso: string): string {
  return localToday(new Date(iso));
}

const sameYear = (date: Date) => date.getFullYear() === new Date().getFullYear();

/** "Oct 20" (or "Oct 20, 2023" outside this year). */
export function shortDate(value: Date): string {
  return value.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear(value) ? {} : { year: 'numeric' }) });
}

export function shortDay(day: string): string {
  return shortDate(parseDay(day));
}

export function shortIso(iso: string): string {
  return shortDate(new Date(iso));
}

/** "Mon Oct 19" for daily rows. */
export function rowDay(day: string): string {
  const date = parseDay(day);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  return `${weekday} ${shortDate(date)}`;
}

/** "Tuesday, October 20" for the day view heading. */
export function longDay(day: string): string {
  const date = parseDay(day);
  return date.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', ...(sameYear(date) ? {} : { year: 'numeric' }),
  });
}

export function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "today", "yesterday", "2 days ago", else a short date. */
export function relativeDay(day: string): string {
  const diff = Math.round((parseDay(localToday()).getTime() - parseDay(day).getTime()) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return shortDay(day);
}

export function isCalendarDay(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseDay(value).getTime()));
}

export function possessive(name: string): string {
  return `${name}’s`;
}

const SUPPORT: Record<string, string> = {
  self_guided: 'Self-guided',
  clinician_supported: 'Working with a clinician',
};
const FOCUS: Record<string, string> = {
  food_hydration: 'Food & hydration',
  movement: 'Movement',
  meditation: 'Quiet pause',
  pacing: 'Pacing',
};

export function supportLabel(value: unknown): string | null {
  return typeof value === 'string' ? SUPPORT[value] ?? null : null;
}

export function focusLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item in FOCUS).map((item) => FOCUS[item]);
}
