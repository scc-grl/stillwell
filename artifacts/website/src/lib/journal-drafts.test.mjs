import assert from "node:assert/strict";
import test from "node:test";
import { journalHistoryDates, readJournalDraft, readJournalDraftDates, writeJournalDraft } from "./journal-drafts.ts";

function memoryStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
function partialDraft(date) {
  return {
    date, startedAt: `${date}T23:59:00Z`, updatedAt: `${date}T23:59:59Z`,
    dailyCheckIn: {
      overallFeeling: null, worseWithActivity: null, summary: "A note I chose to record.",
      symptoms: [{ name: "headache", status: "not_recorded", rating: null }],
    },
    sleep: { hoursSlept: null, bedtime: null, wakeTime: null, quality: null, wakings: null, nap: null, note: "" },
  };
}

test("an unfinished draft stays on its original date after midnight and a later visit", () => {
  const storage = memoryStorage();
  const draft = partialDraft("2026-10-28");
  // Simulate the rollover flush landing after midnight, before the debounce fires.
  draft.updatedAt = "2026-10-29T00:00:00Z";
  assert.equal(writeJournalDraft("patient-a", draft, storage), true);
  for (const today of ["2026-10-29", "2026-11-02"]) {
    assert.deepEqual(journalHistoryDates([], readJournalDraftDates("patient-a", storage), today), ["2026-10-28"]);
    assert.deepEqual(readJournalDraft("patient-a", "2026-10-28", storage), draft);
    assert.equal(readJournalDraft("patient-a", today, storage), null);
  }
  assert.equal(storage.length, 1);
  assert.equal(readJournalDraft("patient-a", draft.date, storage).dailyCheckIn.overallFeeling, null);
  assert.equal(readJournalDraft("patient-a", draft.date, storage).sleep.hoursSlept, null);
});

test("history does not create missing days, duplicate dates, or expose another patient's drafts", () => {
  const storage = memoryStorage();
  writeJournalDraft("patient-a", partialDraft("2026-10-28"), storage);
  writeJournalDraft("patient-b", partialDraft("2026-10-27"), storage);
  assert.deepEqual(journalHistoryDates(["2026-10-20", "2026-10-28"], readJournalDraftDates("patient-a", storage), "2026-10-30"),
    ["2026-10-28", "2026-10-20"]);
});

test("empty drafts don't become entries; a recorded zero is preserved", () => {
  const storage = memoryStorage();
  const draft = partialDraft("2026-10-28");
  draft.dailyCheckIn.summary = "";
  writeJournalDraft("patient-a", draft, storage);
  assert.deepEqual(readJournalDraftDates("patient-a", storage), []);
  draft.sleep.wakings = 0;
  writeJournalDraft("patient-a", draft, storage);
  assert.deepEqual(readJournalDraftDates("patient-a", storage), ["2026-10-28"]);
  assert.equal(readJournalDraft("patient-a", draft.date, storage).sleep.wakings, 0);
});
