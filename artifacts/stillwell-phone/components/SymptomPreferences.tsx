import { useState } from "react";
import { View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { getGetRecoveryQueryKey, useUpdateRecoveryProfile } from "@workspace/api-client-react";
import { checkInSymptoms, defaultSymptoms, type CheckInSymptomName } from "@workspace/recovery-journal";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { Checkbox } from "@workspace/stillwell-design-system/components/native/checkbox";
import { usePatientData } from "@/contexts/PatientDataContext";
import { spacing } from "@/lib/layout";

export function useSymptomPreferences() {
  const { recovery } = usePatientData();
  const cache = useQueryClient();
  const mutation = useUpdateRecoveryProfile();
  const profile = recovery?.profile;
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
  return <Card>
    <Text variant="heading">{title}</Text>
    <Text variant="body">Choose symptoms to track, not diagnoses. You can change these in journal settings.</Text>
    <View style={{ gap: spacing * 2 }}>{checkInSymptoms.map(item => <Checkbox key={item.name} label={item.label} checked={names.includes(item.name)} onPress={() => !saving && setNames(current => current.includes(item.name) ? current.filter(name => name !== item.name) : [...current, item.name])} />)}</View>
    <Button disabled={saving} onPress={async () => {
      setSaving(true); setError("");
      try { await onSave(names); } catch { setError("Your symptom choices could not be saved. Try again."); } finally { setSaving(false); }
    }}>{saving ? "Saving…" : "Save symptom choices"}</Button>
    {error ? <Text accessibilityRole="alert">{error}</Text> : null}
  </Card>;
}
export function SymptomPreferences() {
  const preferences = useSymptomPreferences();
  const [saved, setSaved] = useState(false);
  if (!preferences.profile) return null;
  return <View style={{ gap: spacing * 2 }}><SymptomSelector key={preferences.selected.join(",")} selected={preferences.selected} onSave={async names => { await preferences.save(names); setSaved(true); }} />{saved ? <Text accessibilityLiveRegion="polite">Your symptom choices are saved.</Text> : null}</View>;
}
