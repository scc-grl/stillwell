import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import type {
  DailyCheckIn,
  DailyCheckInSymptomAnswer,
  RecoveryLog,
  RecoveryLogInput,
} from "@workspace/api-client-react";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { File } from "expo-file-system";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { Textarea } from "@workspace/stillwell-design-system/components/native/textarea";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { SafetyNotice } from "@/components/SafetyNotice";
import { spacing } from "@/lib/layout";
import {
  checkInSymptoms,
  dailyCheckInFromLog,
  formatDayNumber,
  formatWeekday,
  makeEmptyDailyCheckIn,
  overallChoices,
  ratingChoices,
  symptomsForRecoveryLog,
  weekDates,
  weeklyInsight,
} from "@/lib/daily-check-in";
import { formatDate } from "@/lib/journal";

type Page = "home" | "symptoms" | "voice" | "review" | "edit" | "saved";
type StartAt = "home" | "review" | "edit" | "saved";

type Props = {
  initial: RecoveryLogInput;
  logs: readonly RecoveryLog[];
  today: string;
  startAt: StartAt;
  onPersist: (log: RecoveryLogInput) => Promise<RecoveryLog>;
  onEditJournal?: () => void;
  onExit?: () => void;
};

function responseFor(
  checkIn: DailyCheckIn,
  name: DailyCheckInSymptomAnswer["name"],
) {
  return checkIn.symptoms.find((response) => response.name === name) ??
    ({ name, status: "not_recorded", rating: null } satisfies DailyCheckInSymptomAnswer);
}

async function removeTemporaryAudio(uri: string | null) {
  if (!uri || Platform.OS === "web") return;
  try {
    await new File(uri).delete();
  } catch {
    // Cache cleanup is best effort; audio is never uploaded or added to a log.
  }
}

export function DailyCheckInFlow({
  initial,
  logs,
  today,
  startAt,
  onPersist,
  onEditJournal,
  onExit,
}: Props) {
  const colors = useColors();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [page, setPage] = useState<Page>(startAt);
  const [log, setLog] = useState<RecoveryLogInput>(initial);
  const [checkIn, setCheckIn] = useState<DailyCheckIn>(() =>
    initial.dailyCheckIn ?? dailyCheckInFromLog(initial),
  );
  const [originalCheckIn, setOriginalCheckIn] = useState<DailyCheckIn>(() =>
    initial.dailyCheckIn ?? dailyCheckInFromLog(initial),
  );
  const [symptomIndex, setSymptomIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const isRecordingRef = useRef(false);
  const stopInProgressRef = useRef(false);
  const audioUriRef = useRef<string | null>(null);
  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);

  const persistCheckIn = useCallback(
    async (next: DailyCheckIn) => {
      const nextLog: RecoveryLogInput = {
        ...log,
        symptoms: symptomsForRecoveryLog(next, log.symptoms),
        dailyCheckIn: next,
      };
      setCheckIn(next);
      setLog(nextLog);
      setSaving(true);
      setError("");
      try {
        const saved = await onPersist(nextLog);
        setLog(saved);
        return true;
      } catch {
        setError("This check-in could not be saved. Your answers are still here; try again.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [log, onPersist],
  );

  const stopRecording = useCallback(async () => {
    if (stopInProgressRef.current) return;
    stopInProgressRef.current = true;
    setRecording(false);
    setPaused(false);
    try {
      await recorder.stop();
      const uri = recorder.uri ?? null;
      setAudioUri(uri);
      audioUriRef.current = uri;
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch {
      setError("The recording could not be finished. You can still tap to log symptoms.");
    } finally {
      isRecordingRef.current = false;
      stopInProgressRef.current = false;
    }
  }, [recorder]);
  stopRecordingRef.current = stopRecording;

  useEffect(() => {
    if (!recording || paused) return;
    const timer = setInterval(() => {
      setElapsed((current) => {
        if (current + 1 >= 180) {
          void stopRecordingRef.current?.();
          return 180;
        }
        return current + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [recording, paused]);

  useEffect(() => {
    const activeRecorder = recorder;
    return () => {
      void (async () => {
        let uri = audioUriRef.current;
        if (isRecordingRef.current) {
          try {
            await activeRecorder.stop();
            uri = activeRecorder.uri ?? uri;
          } catch {
            // The temporary cache file is removed when available below.
          }
        }
        await removeTemporaryAudio(uri);
      })();
    };
  }, [recorder]);

  async function clearAudio() {
    const uri = audioUriRef.current ?? audioUri;
    audioUriRef.current = null;
    setAudioUri(null);
    isRecordingRef.current = false;
    if (recording || paused) {
      try {
        await recorder.stop();
      } catch {
        // Continue to clear the temporary file and leave the voice step.
      }
      setRecording(false);
      setPaused(false);
    }
    await removeTemporaryAudio(uri ?? recorder.uri ?? null);
  }

  async function beginRecording() {
    setError("");
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setPermissionDenied(true);
        setError("Microphone access is off. You can allow it in your device settings, or tap instead.");
        return;
      }
      setPermissionDenied(false);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      isRecordingRef.current = true;
      setElapsed(0);
      setRecording(true);
      setPaused(false);
    } catch {
      setError("Recording is not available right now. You can tap instead to enter your check-in.");
    }
  }

  async function pauseRecording() {
    try {
      recorder.pause();
      setRecording(false);
      setPaused(true);
    } catch {
      setError("The recording could not be paused. You can stop it or tap instead.");
    }
  }

  async function resumeRecording() {
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      recorder.record();
      setRecording(true);
      setPaused(false);
      isRecordingRef.current = true;
    } catch {
      setError("The recording could not be resumed. You can continue by tapping instead.");
    }
  }

  async function leaveFlow() {
    await clearAudio();
    if (onExit) onExit();
    else setPage("home");
  }

  async function chooseOverall(value: DailyCheckIn["overallFeeling"]) {
    const saved = await persistCheckIn({ ...checkIn, overallFeeling: value });
    if (saved) setPage("saved");
  }

  async function answerSymptom(
    answer: DailyCheckInSymptomAnswer,
    nextIndex: number,
  ) {
    const next = {
      ...checkIn,
      symptoms: checkIn.symptoms.map((current) =>
        current.name === answer.name ? answer : current,
      ),
    };
    if (await persistCheckIn(next)) {
      if (nextIndex >= checkInSymptoms.length) setPage("review");
      else setSymptomIndex(nextIndex);
    }
  }

  async function saveReview() {
    if (await persistCheckIn(checkIn)) {
      await clearAudio();
      setPage("saved");
    }
  }

  async function finishVoiceStep() {
    if (recording || paused) await stopRecording();
    setPage("review");
  }

  const dates = weekDates(today);
  const savedDates = new Set(logs.map((entry) => entry.date));
  const symptom = checkInSymptoms[symptomIndex];
  const currentAnswer = symptom
    ? responseFor(checkIn, symptom.name)
    : undefined;
  const insight = weeklyInsight(logs, today);
  const overallLabel = overallChoices.find(
    (choice) => choice.value === checkIn.overallFeeling,
  )?.label;
  const heading = page === "home"
    ? "How is today, overall?"
    : page === "symptoms"
      ? "Add symptoms"
      : page === "voice"
        ? "Say it instead"
        : page === "edit"
          ? "Edit your check-in"
          : page === "review"
            ? "Review your check-in"
            : "Today’s check-in";

  return (
    <View style={styles.container}>
      {onExit ? (
        <Button tone="outline" onPress={leaveFlow} disabled={saving}>
          Back
        </Button>
      ) : null}
      <View style={styles.heading}>
        <Text variant="label">
          {page === "saved" ? "CHECK-IN SAVED" : page === "edit" ? "EDIT CHECK-IN" : "DAILY CHECK-IN"}
        </Text>
        <Text variant="display">{heading}</Text>
        <Text variant="body">{formatDate(initial.date)}</Text>
      </View>

      {page === "home" ? (
        <>
          <Card inset="compact">
            <Text variant="label">Your last seven days</Text>
            <View style={styles.weekStrip}>
              {dates.map((date) => (
                <View key={date} style={styles.weekCell}>
                  <Text variant="caption" color={colors.mutedForeground}>
                    {formatWeekday(date)}
                  </Text>
                  <Text variant="label">{formatDayNumber(date)}</Text>
                  <Text
                    variant="caption"
                    color={savedDates.has(date) ? colors.primary : colors.mutedForeground}
                    accessibilityLabel={savedDates.has(date) ? "Check-in saved" : "No check-in"}
                  >
                    {savedDates.has(date) ? "●" : "—"}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
          <Card tone="sage">
            <Text variant="heading">How is today, overall?</Text>
            <Text variant="caption">One tap saves a check-in. You can add detail now or later.</Text>
            <View style={styles.choiceWrap}>
              {overallChoices.map((choice) => (
                <Button
                  key={choice.value}
                  tone={checkIn.overallFeeling === choice.value ? "primary" : "outline"}
                  fullWidth={false}
                  style={styles.choice}
                  onPress={() => void chooseOverall(choice.value)}
                  disabled={saving}
                >
                  {choice.label}
                </Button>
              ))}
            </View>
          </Card>
          <Button tone="outline" leading={<Text variant="label">＋</Text>} onPress={() => {
            setSymptomIndex(0);
            setPage("symptoms");
          }}>
            Add symptoms
          </Button>
          <Button tone="secondary" onPress={() => setPage("voice")}>
            Say it instead
          </Button>
          {onEditJournal ? (
            <Button tone="outline" onPress={onEditJournal}>
              Log food, movement and pacing
            </Button>
          ) : null}
        </>
      ) : null}

      {page === "symptoms" && symptom && currentAnswer ? (
        <>
          <View style={styles.progressHeader}>
            <Text variant="label">Progress {symptomIndex + 1} of {checkInSymptoms.length}</Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${((symptomIndex + 1) / checkInSymptoms.length) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
          <Card>
            <Text variant="heading">{symptom.label}</Text>
            <Text variant="caption">Choose the description that fits today, or skip.</Text>
            <View style={styles.optionList}>
              {ratingChoices.map((choice) => (
                <Button
                  key={choice.value}
                  tone={currentAnswer.status === "recorded" && currentAnswer.rating === choice.value ? "primary" : "outline"}
                  onPress={() => void answerSymptom(
                    { name: symptom.name, status: "recorded", rating: choice.value },
                    symptomIndex + 1,
                  )}
                  disabled={saving}
                >
                  {choice.label}
                </Button>
              ))}
            </View>
            <Button
              tone="outline"
              onPress={() => void answerSymptom(
                { name: symptom.name, status: "not_recorded", rating: null },
                symptomIndex + 1,
              )}
              disabled={saving}
            >
              Skip this symptom
            </Button>
          </Card>
          <View style={styles.actionRow}>
            {symptomIndex > 0 ? (
              <Button
                tone="outline"
                fullWidth={false}
                style={styles.rowButton}
                onPress={() => setSymptomIndex((index) => Math.max(0, index - 1))}
                disabled={saving}
              >
                Previous
              </Button>
            ) : null}
            <Button
              tone="secondary"
              fullWidth={false}
              style={styles.rowButton}
              onPress={async () => {
                if (await persistCheckIn(checkIn)) setPage("saved");
              }}
              disabled={saving}
            >
              Save and stop here
            </Button>
          </View>
        </>
      ) : null}

      {page === "voice" ? (
        <Card tone="sage">
          <Text variant="heading">A private voice note</Text>
          <Text variant="body">
            Record up to three minutes. You can pause and resume. The audio stays on this device temporarily and is never added to your journal or shared.
          </Text>
          <Text variant="label">
            {`${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")} / 03:00`}
          </Text>
          {!recording && !paused && !audioUri ? (
            <Button onPress={() => void beginRecording()}>Start recording</Button>
          ) : null}
          {recording ? (
            <Button tone="secondary" onPress={() => void pauseRecording()}>
              Pause recording
            </Button>
          ) : null}
          {paused ? (
            <Button onPress={() => void resumeRecording()}>Resume recording</Button>
          ) : null}
          {recording || paused ? (
            <Button tone="outline" onPress={() => void finishVoiceStep()}>
              Stop and review
            </Button>
          ) : null}
          {audioUri && !recording && !paused ? (
            <>
              <Text variant="caption">
                Transcription is not connected yet. The audio has not been sent anywhere. Please enter scores and a summary yourself; unconfirmed symptoms stay “Not mentioned · please check”.
              </Text>
              <Button onPress={() => void finishVoiceStep()}>Continue to review</Button>
            </>
          ) : null}
          {permissionDenied ? (
            <Button tone="outline" onPress={() => void Linking.openSettings()}>
              Open device settings
            </Button>
          ) : null}
          <Button
            tone="outline"
            onPress={async () => {
              await clearAudio();
              setPage("symptoms");
              setSymptomIndex(0);
            }}
          >
            Tap instead
          </Button>
        </Card>
      ) : null}

      {page === "review" || page === "edit" ? (
        <>
          <Card tone="sage">
            <Text variant="heading">What you’d share is always your choice</Text>
            <Text variant="caption">
              This is the information a clinician could see only if you choose to share your symptoms. Audio is never shared.
            </Text>
          </Card>
          {audioUri ? (
            <Card>
              <Text variant="label">VOICE TRANSCRIPTION PLACEHOLDER</Text>
              <Text variant="caption">
                Transcription is not connected. Nothing has been guessed from your recording; please check each symptom and enter any summary below.
              </Text>
            </Card>
          ) : null}
          <Card inset="compact">
            <Text variant="label">Overall, how did today feel?</Text>
            {page === "edit" ? (
              <Text variant="caption">
                Was: {overallChoices.find((choice) => choice.value === originalCheckIn.overallFeeling)?.label ?? "Not recorded"}
              </Text>
            ) : null}
            <View style={styles.choiceWrap}>
              {overallChoices.map((choice) => (
                <Button
                  key={choice.value}
                  tone={checkIn.overallFeeling === choice.value ? "primary" : "outline"}
                  fullWidth={false}
                  style={styles.choice}
                  onPress={() =>
                    setCheckIn((current) => ({ ...current, overallFeeling: choice.value }))
                  }
                  disabled={saving}
                >
                  {choice.label}
                </Button>
              ))}
            </View>
          </Card>
          {checkIn.symptoms.map((answer) => {
            const config = checkInSymptoms.find((item) => item.name === answer.name)!;
            return (
              <Card key={answer.name} inset="compact">
                <Text variant="heading">{config.label}</Text>
                <Text variant="caption">
                  {answer.status === "recorded"
                    ? ratingChoices.find((choice) => choice.value === answer.rating)?.label
                    : "Not mentioned · please check"}
                </Text>
                {page === "edit" ? (
                  <Text variant="caption">
                    Was: {(() => {
                      const previous = responseFor(originalCheckIn, answer.name);
                      return previous.status === "recorded"
                        ? ratingChoices.find((choice) => choice.value === previous.rating)?.label
                        : "Not recorded";
                    })()}
                  </Text>
                ) : null}
                <View style={styles.choiceWrap}>
                  {ratingChoices.map((choice) => (
                    <Button
                      key={choice.value}
                      tone={answer.status === "recorded" && answer.rating === choice.value ? "primary" : "outline"}
                      fullWidth={false}
                      style={styles.reviewChoice}
                      onPress={() => {
                        const next = {
                          ...checkIn,
                          symptoms: checkIn.symptoms.map((item) =>
                            item.name === answer.name
                              ? { name: item.name, status: "recorded" as const, rating: choice.value }
                              : item,
                          ),
                        };
                        setCheckIn(next);
                      }}
                      disabled={saving}
                    >
                      {choice.label}
                    </Button>
                  ))}
                  <Button
                    tone={answer.status === "not_recorded" ? "secondary" : "outline"}
                    fullWidth={false}
                    style={styles.reviewChoice}
                    onPress={() => {
                      const next = {
                        ...checkIn,
                        symptoms: checkIn.symptoms.map((item) =>
                          item.name === answer.name
                            ? { name: item.name, status: "not_recorded" as const, rating: null }
                            : item,
                        ),
                      };
                      setCheckIn(next);
                    }}
                    disabled={saving}
                  >
                    Not recorded
                  </Button>
                </View>
              </Card>
            );
          })}
          <Textarea
            label="Short summary (optional)"
            value={checkIn.summary}
            onChangeText={(summary) => setCheckIn((current) => ({ ...current, summary }))}
            placeholder="Add a few words about how today felt."
            maxLength={500}
            accessibilityLabel="Short summary"
          />
          {page === "edit" ? (
            <Text variant="caption">
              Was: {originalCheckIn.summary.trim() || "No summary added."}
            </Text>
          ) : null}
          <View style={styles.actionRow}>
            {page === "review" ? (
              <Button
                tone="outline"
                fullWidth={false}
                style={styles.rowButton}
                onPress={() => {
                  setSymptomIndex(0);
                  setPage("symptoms");
                }}
              >
                Tap to answer
              </Button>
            ) : null}
            <Button fullWidth={false} style={styles.rowButton} onPress={() => void saveReview()} disabled={saving}>
              {saving ? "Saving…" : "Save check-in"}
            </Button>
          </View>
        </>
      ) : null}

      {page === "saved" ? (
        <>
          <Card tone="sage">
            <Text variant="heading">
              {checkIn.summary.trim()
                ? checkIn.summary.trim()
                : overallLabel
                  ? `Today felt ${overallLabel.toLowerCase()}.`
                  : "Your check-in is saved."}
            </Text>
            <Text variant="caption">Saved for {formatDate(initial.date)}</Text>
            <View style={styles.scoreChips}>
              {overallLabel ? (
                <View
                  style={[
                    styles.scoreChip,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <Text variant="caption" color={colors.secondaryForeground}>
                    Overall · {overallLabel}
                  </Text>
                </View>
              ) : null}
              {checkIn.symptoms.map((answer) => {
                const config = checkInSymptoms.find((item) => item.name === answer.name)!;
                const label = answer.status === "recorded"
                  ? ratingChoices.find((choice) => choice.value === answer.rating)?.label
                  : "Not recorded";
                return (
                  <View
                    key={answer.name}
                    style={[
                      styles.scoreChip,
                      {
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                        borderRadius: colors.radius,
                      },
                    ]}
                  >
                    <Text variant="caption" color={colors.secondaryForeground}>
                      {config.label} · {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
          {insight ? (
            <Card>
              <Text variant="label">A weekly pattern</Text>
              <Text variant="body">{insight}</Text>
              <Text variant="caption">A pattern to notice, not a diagnosis.</Text>
            </Card>
          ) : null}
          <Button
            onPress={() => {
              setOriginalCheckIn(checkIn);
              setPage("edit");
            }}
          >
            {today === initial.date ? "Edit today" : "Edit this check-in"}
          </Button>
          {onEditJournal ? (
            <Button tone="outline" onPress={onEditJournal}>
              Edit food, movement and pacing
            </Button>
          ) : null}
          {onExit ? (
            <Button tone="outline" onPress={leaveFlow}>
              Back to history
            </Button>
          ) : (
            <Button tone="outline" onPress={() => setPage("home")}>
              Back to today
            </Button>
          )}
        </>
      ) : null}

      {saving ? (
        <View style={styles.saving}>
          <ActivityIndicator color={colors.primary} />
          <Text variant="caption">Saving privately to your journal…</Text>
        </View>
      ) : null}
      {error ? (
        <Card tone="sage">
          <Text variant="caption" accessibilityLiveRegion="polite">{error}</Text>
        </Card>
      ) : null}
      <SafetyNotice />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing * 3,
  },
  heading: {
    gap: spacing * 2,
    paddingVertical: spacing,
  },
  weekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing,
  },
  weekCell: {
    flex: 1,
    alignItems: "center",
    gap: spacing,
    minHeight: 48,
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing,
  },
  choice: {
    flexGrow: 1,
  },
  reviewChoice: {
    flexGrow: 1,
    minWidth: "44%",
  },
  optionList: {
    gap: spacing * 2,
  },
  progressHeader: {
    gap: spacing * 2,
  },
  progressTrack: {
    height: spacing,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing * 2,
  },
  rowButton: {
    flexGrow: 1,
  },
  scoreChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing,
    paddingTop: spacing,
  },
  scoreChip: {
    borderWidth: 1,
    paddingHorizontal: spacing * 2,
    paddingVertical: spacing,
  },
  saving: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing * 2,
    minHeight: 44,
  },
});
