import { useState } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetRecoveryQueryKey, useGetRecovery, useUpdateRecoveryProfile } from "@workspace/api-client-react";
import { checkInSymptoms, defaultSymptoms, type CheckInSymptomName } from "@workspace/recovery-journal";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";

export function useSymptomPreferences(enabled = true) {
  const { user } = useUser();
  const cache = useQueryClient();
  const query = useGetRecovery({ query: { queryKey: [...getGetRecoveryQueryKey(), user?.id ?? ""], enabled: enabled && !!user, retry: false } });
  const mutation = useUpdateRecoveryProfile();
  const profile = query.data?.profile;
  return {
    profile,
    selected: profile?.selectedSymptoms ?? defaultSymptoms,
    save: async (selectedSymptoms: CheckInSymptomName[]) => {
      if (!profile) return;
      await mutation.mutateAsync({ data: { supportMode: profile.supportMode, priorities: profile.priorities, selectedSymptoms } });
      await cache.invalidateQueries({ queryKey: getGetRecoveryQueryKey() });
    },
  };
}

export function SymptomSelector({ selected, onSave, title = "Symptoms to track" }: {
  selected: readonly string[]; onSave: (names: CheckInSymptomName[]) => Promise<void> | void; title?: string;
}) {
  const [names, setNames] = useState<CheckInSymptomName[]>(selected as CheckInSymptomName[]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return <Card className="space-y-4 p-5">
    <h3 className="font-serif text-xl">{title}</h3>
    <p className="text-sm text-muted-foreground">Choose symptoms to track, not diagnoses. You can change these in journal settings.</p>
    <div className="flex flex-wrap gap-2">{checkInSymptoms.map(item => <Button key={item.name} variant={names.includes(item.name) ? "default" : "outline"} aria-pressed={names.includes(item.name)} disabled={saving} onClick={() => setNames(current => current.includes(item.name) ? current.filter(name => name !== item.name) : [...current, item.name])}>{item.label}</Button>)}</div>
    <Button disabled={saving} onClick={async () => {
      setSaving(true); setError("");
      try { await onSave(names); } catch { setError("Your symptom choices could not be saved. Try again."); } finally { setSaving(false); }
    }}>{saving ? "Saving…" : "Save symptom choices"}</Button>
    {error && <p role="alert">{error}</p>}
  </Card>;
}

export function SymptomPreferences() {
  const preferences = useSymptomPreferences();
  const [saved, setSaved] = useState(false);
  if (!preferences.profile) return null;
  return <div className="space-y-2"><SymptomSelector key={preferences.selected.join(",")} selected={preferences.selected} onSave={async names => { await preferences.save(names); setSaved(true); }} />{saved && <p role="status">Your symptom choices are saved.</p>}</div>;
}
