export type PatientStatus = "New" | "Existing";
export type SymptomKey = "headache" | "fatigue" | "fog" | "sleep" | "mood" | "light";
export type Ratings = Partial<Record<SymptomKey, number>>;

export type CheckIn = {
  date: string;
  ratings: Ratings;
  reflection?: string;
};

export type DemoPatient = {
  id: string;
  firstName: string;
  lastName: string;
  status: PatientStatus;
  baselineDate: string;
  baseline: Ratings;
  checkIns: CheckIn[];
  sharedReflections: boolean;
};

export const symptoms: { key: SymptomKey; label: string }[] = [
  { key: "headache", label: "Headache" },
  { key: "fatigue", label: "Fatigue" },
  { key: "fog", label: "Fog" },
  { key: "sleep", label: "Sleep" },
  { key: "mood", label: "Mood" },
  { key: "light", label: "Light" },
];

export const scaleLabels = [
  "Not noticeable",
  "Less noticeable",
  "Noticeable",
  "More noticeable",
];

export const demoPatients: DemoPatient[] = [
  {
    id: "ST-2041",
    firstName: "Taylor",
    lastName: "Bennett",
    status: "Existing",
    baselineDate: "2025-01-06",
    baseline: { headache: 3, fatigue: 2, fog: 2, sleep: 3, mood: 1, light: 2 },
    checkIns: [
      {
        date: "2025-01-14",
        ratings: { headache: 2, fatigue: 3, fog: 2, sleep: 3, mood: 1, light: 2 },
        reflection: "I had a quieter afternoon and still felt tired by evening.",
      },
      {
        date: "2025-01-28",
        ratings: { headache: 2, fatigue: 2, fog: 1, sleep: 2, mood: 2, light: 1 },
      },
      {
        date: "2025-02-12",
        ratings: { fatigue: 2, fog: 1, sleep: 2, mood: 1, light: 2 },
        reflection: "A short walk felt manageable. I needed a quiet hour afterward.",
      },
    ],
    sharedReflections: true,
  },
  {
    id: "ST-2078",
    firstName: "Morgan",
    lastName: "Lee",
    status: "New",
    baselineDate: "2025-02-03",
    baseline: { headache: 2, fatigue: 3, fog: 2, sleep: 3, mood: 2, light: 1 },
    checkIns: [
      {
        date: "2025-02-06",
        ratings: { headache: 2, fatigue: 3, fog: 3, sleep: 2, mood: 1, light: 1 },
        reflection: "The middle of the day was busy; I took a longer break later.",
      },
      {
        date: "2025-02-14",
        ratings: { headache: 1, fatigue: 2, fog: 2, sleep: 2, mood: 2 },
      },
    ],
    sharedReflections: true,
  },
  {
    id: "ST-2116",
    firstName: "Sam",
    lastName: "Rivera",
    status: "Existing",
    baselineDate: "2025-01-10",
    baseline: { headache: 2, fatigue: 3, fog: 3, sleep: 2, mood: 2, light: 3 },
    checkIns: [
      {
        date: "2025-01-24",
        ratings: { headache: 3, fatigue: 2, fog: 2, sleep: 3, mood: 2, light: 2 },
        reflection: "Bright rooms felt harder this week. I made time for a slower morning.",
      },
      {
        date: "2025-02-07",
        ratings: { headache: 2, fatigue: 2, fog: 1, sleep: 2, mood: 1, light: 2 },
      },
      {
        date: "2025-02-15",
        ratings: { headache: 2, fog: 2, sleep: 2, mood: 1, light: 1 },
        reflection: "Some days are still uneven. I was glad to have company at lunch.",
      },
    ],
    sharedReflections: true,
  },
  {
    id: "ST-2193",
    firstName: "Jordan",
    lastName: "Patel",
    status: "New",
    baselineDate: "2025-02-05",
    baseline: { headache: 1, fatigue: 2, fog: 2, sleep: 2, mood: 1, light: 2 },
    checkIns: [
      {
        date: "2025-02-09",
        ratings: { headache: 2, fatigue: 2, fog: 1, sleep: 3, mood: 1, light: 2 },
      },
      {
        date: "2025-02-16",
        ratings: { headache: 1, fatigue: 3, fog: 2, sleep: 2, mood: 2, light: 1 },
        reflection: "I noticed I was ready to stop and rest sooner than I expected.",
      },
    ],
    sharedReflections: true,
  },
  {
    id: "ST-2230",
    firstName: "Alex",
    lastName: "Chen",
    status: "Existing",
    baselineDate: "2025-01-08",
    baseline: { headache: 3, fatigue: 3, fog: 2, sleep: 2, mood: 2, light: 3 },
    checkIns: [
      {
        date: "2025-01-22",
        ratings: { headache: 2, fatigue: 2, fog: 3, sleep: 2, mood: 1, light: 2 },
        reflection: "Concentration came and went during the afternoon.",
      },
      {
        date: "2025-02-05",
        ratings: { headache: 2, fatigue: 3, fog: 2, sleep: 1, mood: 2, light: 2 },
      },
      {
        date: "2025-02-17",
        ratings: { headache: 1, fatigue: 2, fog: 2, sleep: 2, mood: 1 },
        reflection: "I spent a little time outside, then chose a restful evening.",
      },
    ],
    sharedReflections: true,
  },
  {
    id: "ST-2284",
    firstName: "Riley",
    lastName: "Thompson",
    status: "Existing",
    baselineDate: "2025-01-12",
    baseline: { headache: 2, fatigue: 2, fog: 3, sleep: 3, mood: 1, light: 2 },
    checkIns: [
      {
        date: "2025-01-26",
        ratings: { headache: 1, fatigue: 3, fog: 2, sleep: 2, mood: 2, light: 2 },
        reflection: "I slept lightly and kept the next morning low-key.",
      },
      {
        date: "2025-02-09",
        ratings: { headache: 2, fatigue: 2, fog: 1, sleep: 2, mood: 1, light: 1 },
      },
      {
        date: "2025-02-18",
        ratings: { headache: 1, fatigue: 2, fog: 2, sleep: 3, mood: 1, light: 1 },
        reflection: "The week had a mix of easier and harder moments.",
      },
    ],
    sharedReflections: true,
  },
];

export function patientName(patient: DemoPatient) {
  return `${patient.firstName} ${patient.lastName}`;
}

export function formatDemoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ratingLabel(value: number | undefined) {
  return value === undefined ? "Not supplied" : scaleLabels[value] ?? "Not supplied";
}
