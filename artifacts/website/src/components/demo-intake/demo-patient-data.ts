import {
  checkInSymptoms,
  defaultSymptoms,
  overallChoices,
  type CheckInSymptomName,
} from "@workspace/recovery-journal";

export const MAYA_DEMO_DATE = "2026-10-29";
export const MAYA_DEMO_DATE_LABEL = "Thursday, October 29";

export type DemoOverall = (typeof overallChoices)[number]["value"];
export type DemoRating = 0 | 1 | 2 | 3;
export type DemoSleepQuality = "poor" | "fair" | "good" | "great";
export type DemoNap = "none" | "under_30" | "30_or_more";

export type DemoSleep = {
  hoursSlept: number | null;
  bedtime: string;
  wakeTime: string;
  quality: DemoSleepQuality | null;
  wakings: 0 | 1 | 2 | 3 | null;
  nap: DemoNap | null;
  note: string;
};

export type DemoEntry = {
  date: string;
  overall: DemoOverall | null;
  symptoms: Partial<Record<CheckInSymptomName, DemoRating | null>>;
  addedSymptoms: CheckInSymptomName[];
  sleep: DemoSleep;
  note: string;
  saved: boolean;
};

export type DemoRoutine = {
  id: "movement" | "pacing" | "quiet";
  title: string;
  detail: string;
  selected: boolean;
  done: boolean;
};

export type MayaDemoState = {
  entries: DemoEntry[];
  trackedSymptoms: CheckInSymptomName[];
  routine: DemoRoutine[];
};

function makeEntry(
  date: string,
  overall: DemoOverall,
  symptoms: Partial<Record<CheckInSymptomName, DemoRating | null>>,
  sleep: Partial<DemoSleep> = {},
  note = "",
  saved = true,
): DemoEntry {
  return {
    date,
    overall,
    symptoms,
    addedSymptoms: [],
    sleep: {
      hoursSlept: null,
      bedtime: "",
      wakeTime: "",
      quality: null,
      wakings: null,
      nap: null,
      note: "",
      ...sleep,
    },
    note,
    saved,
  };
}

export function createMayaDemoState(): MayaDemoState {
  return {
    trackedSymptoms: [...defaultSymptoms],
    routine: [
      {
        id: "movement",
        title: "Movement",
        detail: "Record the activity you did, or the rest you chose. Ask a clinician what exercise is appropriate; this journal does not set intensity or progression.",
        selected: true,
        done: true,
      },
      {
        id: "pacing",
        title: "Pacing",
        detail: "Choose a manageable priority and leave room to adjust. At the end of the day, note any breaks, changed plans, or things you chose not to do.",
        selected: true,
        done: true,
      },
      {
        id: "quiet",
        title: "Quiet pause",
        detail: "If comfortable, choose a familiar meditation or a quiet pause. Skip or stop if it feels distressing or makes symptoms worse; duration is optional.",
        selected: true,
        done: false,
      },
    ],
    entries: [
      makeEntry("2026-10-29", "good", { headache: 1, fatigue: 1, fog: 1, sleep: 0, mood: 0, light: 1 }, {
        hoursSlept: 8,
        bedtime: "23:00",
        wakeTime: "07:00",
        quality: "good",
      }, "", false),
      makeEntry("2026-10-28", "okay", { headache: 1, fatigue: 1, fog: 2, sleep: 0, mood: 1, light: 1 }),
      makeEntry("2026-10-27", "low", { headache: 2, fatigue: 2, fog: 2, sleep: 1, mood: 1, light: 2 }),
      makeEntry("2026-10-26", "okay", { headache: 1, fatigue: 1, fog: 1, sleep: 1, mood: 0, light: 1 }),
      makeEntry("2026-10-23", "okay", { headache: 1, fatigue: 1, fog: 1, sleep: 0, mood: 0, light: 1 }),
      makeEntry("2026-10-22", "good", { headache: 0, fatigue: 1, fog: 1, sleep: 0, mood: 0, light: 0 }),
      makeEntry("2026-10-21", "okay", { headache: 1, fatigue: 1, fog: 1, sleep: 1, mood: 0, light: 1 }),
    ],
  };
}

export function upsertDemoEntry(state: MayaDemoState, entry: DemoEntry): MayaDemoState {
  const copy: DemoEntry = {
    ...entry,
    symptoms: { ...entry.symptoms },
    addedSymptoms: [...entry.addedSymptoms],
    sleep: { ...entry.sleep },
  };
  return {
    ...state,
    entries: [...state.entries.filter((item) => item.date !== copy.date), copy]
      .sort((left, right) => right.date.localeCompare(left.date)),
  };
}

export function makeEmptyDemoEntry(date: string): DemoEntry {
  return {
    date,
    overall: null,
    symptoms: Object.fromEntries(checkInSymptoms.map(({ name }) => [name, null])),
    addedSymptoms: [],
    sleep: {
      hoursSlept: null,
      bedtime: "",
      wakeTime: "",
      quality: null,
      wakings: null,
      nap: null,
      note: "",
    },
    note: "",
    saved: false,
  };
}

export function formatMayaDate(date: string, includeYear = false): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(includeYear ? { year: "numeric" as const } : {}),
  }).format(new Date(`${date}T12:00:00`));
}
