export type SymptomId =
  | "overall"
  | "headache"
  | "dizziness"
  | "nausea"
  | "tinnitus"
  | "lowMood"
  | "sleep"
  | "attention"
  | "light"
  | "memory";

export type SymptomValues = Partial<Record<SymptomId, number>>;
export type RoutineStatus = "did" | "did_not" | "not_planned";
export type RoutineValues = Partial<Record<"food" | "movement", RoutineStatus>>;

export type JourneyEntry = {
  id?: string;
  date: string;
  cadence: "daily" | "weekly";
  symptoms: SymptomValues;
  statuses: RoutineValues;
  routineNotes?: Partial<Record<"food" | "movement", string>>;
  reflection: string;
  moment?: string;
  momentMarked: boolean;
  previewEntry?: boolean;
  momentEdited?: boolean;
};

export const symptoms: { id: SymptomId; label: string }[] = [
  { id: "overall", label: "Overall difficulty from symptoms" },
  { id: "headache", label: "Headache" },
  { id: "dizziness", label: "Dizziness" },
  { id: "nausea", label: "Nausea" },
  { id: "tinnitus", label: "Tinnitus or ringing in the ears" },
  { id: "lowMood", label: "Low mood or depressive symptoms" },
  { id: "sleep", label: "Difficulty sleeping" },
  { id: "attention", label: "Attention or concentration difficulty" },
  { id: "light", label: "Sensitivity to light" },
  { id: "memory", label: "Forgetfulness or memory difficulty" },
];

export const scaleLabels = ["Not present", "Mild", "Moderate", "Severe", "Very severe"];

export const routineLabels: Record<"food" | "movement", string> = {
  food: "Food and hydration",
  movement: "Movement or rest",
};

export const protocolStart = "2025-01-01";
export const exampleToday = "2025-02-12";
export const trackedSymptoms: SymptomId[] = ["headache", "sleep", "attention"];
export const protocolChoices = ["Meals", "Fluids", "Rest", "An already-cleared walk"];
export const exerciseMilestones = [
  "Observe current capacity",
  "Repeat only a routine already cleared by a clinician",
  "Review a possible next step with a clinician",
];

export const baseline: SymptomValues = {
  headache: 3,
  sleep: 3,
  attention: 2,
};

// Illustration-only: sparse and non-monotonic; these are not a complete daily series.
export const exampleEntries: JourneyEntry[] = [
  {
    date: "2025-01-02",
    cadence: "daily",
    symptoms: { headache: 3, sleep: 4, attention: 2 },
    statuses: { food: "did", movement: "not_planned" },
    reflection: "I kept things quiet after lunch. Sleep felt choppy again.",
    momentMarked: false,
  },
  {
    date: "2025-01-05",
    cadence: "daily",
    symptoms: { headache: 2, sleep: 3, attention: 3 },
    statuses: { food: "did_not", movement: "did" },
    reflection: "A short walk felt okay, then the busy shop was a lot.",
    momentMarked: false,
  },
  {
    date: "2025-01-12",
    cadence: "daily",
    symptoms: { headache: 3, sleep: 2, attention: 2 },
    statuses: { food: "did", movement: "did_not" },
    reflection: "Rested more today. The headache came back by evening.",
    momentMarked: false,
  },
  {
    date: "2025-01-22",
    cadence: "daily",
    symptoms: { sleep: 3, attention: 1 },
    statuses: { food: "not_planned", movement: "did" },
    reflection: "I took the familiar route outside and came home before I felt worn out.",
    momentMarked: false,
  },
  {
    date: "2025-01-30",
    cadence: "daily",
    symptoms: { headache: 1, sleep: 2, attention: 2 },
    statuses: { food: "did", movement: "not_planned" },
    reflection: "A quieter evening helped me notice when I needed a break.",
    momentMarked: false,
  },
  {
    date: "2025-02-05",
    cadence: "weekly",
    symptoms: { headache: 2, sleep: 2, attention: 3 },
    statuses: { food: "did", movement: "did" },
    reflection: "More activity this week, with a couple of slower afternoons.",
    momentMarked: false,
  },
  {
    date: "2025-02-12",
    cadence: "weekly",
    symptoms: { sleep: 1, attention: 2 },
    statuses: { food: "did", movement: "did" },
    reflection: "I walked to the corner shop and back. I still needed a quiet hour afterward.",
    routineNotes: { movement: "Walked to the corner shop, then took a quiet break." },
    moment: "I made it to the corner shop on my own.",
    momentMarked: true,
  },
];

export function formatDate(value: string) {
  if (!isValidDate(value)) return "Date not selected";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function daysSince(start: string, end: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  return Math.floor((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86400000) + 1;
}

export function cadenceFor(date: string): "daily" | "weekly" {
  return daysSince(protocolStart, date) <= 30 ? "daily" : "weekly";
}

export function answerLabel(value: RoutineStatus | undefined) {
  if (value === "did") return "Did";
  if (value === "did_not") return "Did not";
  if (value === "not_planned") return "Not planned";
  return "Not recorded";
}
