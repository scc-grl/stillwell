import type { DailyCheckIn, RecoveryLogInput } from "@workspace/api-client-react";

export type JournalDraft = {
  date: string;
  updatedAt: string;
  startedAt?: string;
  dailyCheckIn: DailyCheckIn;
  sleep: NonNullable<RecoveryLogInput["sleep"]>;
};

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "key" | "length">;

export function storageKey(ownerId: string, date: string) {
  return `stillwell.journal-draft:${encodeURIComponent(ownerId)}:${date}`;
}

export function readJournalDraft(ownerId: string, date: string, storage: DraftStorage = localStorage): JournalDraft | null {
  try {
    const raw = storage.getItem(storageKey(ownerId, date));
    if (!raw) return null;
    const draft = JSON.parse(raw) as JournalDraft;
    return draft?.date === date && Array.isArray(draft.dailyCheckIn?.symptoms) && draft.sleep
      ? draft : null;
  } catch {
    return null;
  }
}

export function writeJournalDraft(ownerId: string, draft: JournalDraft, storage: DraftStorage = localStorage) {
  try {
    // Never re-date a draft from its timestamp: edits after midnight belong to its original day.
    storage.setItem(storageKey(ownerId, draft.date), JSON.stringify(draft));
    return true;
  } catch {
    // Private journal values must not be logged, including on storage failure.
    return false;
  }
}

function hasRecordedContent(draft: JournalDraft) {
  const checkIn = draft.dailyCheckIn;
  return Boolean(checkIn.overallFeeling || checkIn.summary?.trim() || checkIn.worseWithActivity
    || checkIn.symptoms.some(answer => answer.status === "recorded" && answer.rating != null)
    || Object.entries(draft.sleep).some(([key, value]) => key === "note"
      ? typeof value === "string" && Boolean(value.trim())
      : value !== null && value !== undefined && value !== ""));
}

export function readJournalDraftDates(ownerId: string, storage: DraftStorage = localStorage): string[] {
  if (!ownerId) return [];
  const prefix = `stillwell.journal-draft:${encodeURIComponent(ownerId)}:`;
  const dates: string[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const date = key.slice(prefix.length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const draft = readJournalDraft(ownerId, date, storage);
      if (draft && hasRecordedContent(draft)) dates.push(date);
    }
  } catch { /* Return only dates successfully read; never invent entries. */ }
  return dates;
}

export function journalHistoryDates(savedDates: readonly string[], draftDates: readonly string[], today: string) {
  return [...new Set([...savedDates, ...draftDates])].filter(date => date < today)
    .sort((a, b) => b.localeCompare(a));
}
