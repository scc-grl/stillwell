import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import type {
  DailyCheckIn,
  DailyCheckInSymptomAnswer,
  RecoveryLog,
  RecoveryLogInput,
} from "@workspace/api-client-react";
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
  summaryLine,
  hasSavedCheckIn,
} from "@workspace/recovery-journal";
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
  exitLabel?: string;
  draftMode?: boolean;
};

function responseFor(
  checkIn: DailyCheckIn,
  name: DailyCheckInSymptomAnswer["name"],
) {
  return checkIn.symptoms.find((response) => response.name === name) ??
    ({ name, status: "not_recorded", rating: null } satisfies DailyCheckInSymptomAnswer);
}

export function DailyCheckInFlow({
  initial,
  logs,
  today,
  startAt,
  onPersist,
  onEditJournal,
  onExit,
  exitLabel,
  draftMode = false,
}: Props) {
  const colors = useColors();
  const [page, setPage] = useState<Page>(startAt);
  const [log, setLog] = useState<RecoveryLogInput>(initial);
  const [checkIn, setCheckIn] = useState<DailyCheckIn>(() =>
    dailyCheckInFromLog(initial),
  );
  const [originalCheckIn, setOriginalCheckIn] = useState<DailyCheckIn>(() =>
    dailyCheckInFromLog(initial),
  );
  const [symptomIndex, setSymptomIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [voiceDraft, setVoiceDraft] = useState(initial.dailyCheckIn?.summary ?? "");

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

  async function leaveFlow() {
    setVoiceDraft("");
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
      setVoiceDraft("");
      setPage("saved");
    }
  }

  function finishVoiceStep() {
    setCheckIn((current) => ({ ...current, summary: voiceDraft }));
    setPage("review");
  }

  const dates = weekDates(today);
  const savedDates = new Set(logs.filter(hasSavedCheckIn).map((entry) => entry.date));
  const symptom = checkInSymptoms[symptomIndex];
  const currentAnswer = symptom
    ? responseFor(checkIn, symptom.name)
    : undefined;
  const insight = draftMode ? null : weeklyInsight(logs, today);
  const overallLabel = overallChoices.find(
    (choice) => choice.value === checkIn.overallFeeling,
  )?.label;
  const heading = page === "home"
    ? "How is today, overall?"
    : page === "symptoms"
      ? "Add symptoms"
            : page === "voice"
              ? "Use voice-to-text"
        : page === "edit"
          ? "Edit your check-in"
          : page === "review"
            ? "Review your check-in"
            : "Today’s check-in";

  return (
    <View style={styles.container}>
      {onExit ? (
        <Button
          tone="outline"
          onPress={leaveFlow}
          disabled={saving}
          testID="check-in-exit"
        >
          {exitLabel ?? "Back"}
        </Button>
      ) : null}
      <View style={styles.heading}>
        <Text variant="label">
          {page === "saved" ? (draftMode ? "SUMMARY READY" : "CHECK-IN SAVED") : page === "edit" ? "EDIT CHECK-IN" : "DAILY CHECK-IN"}
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
          <Button tone="secondary" onPress={() => { setVoiceDraft(checkIn.summary); setPage("voice"); }}>
            Use voice-to-text
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
          <Text variant="heading">Speak your check-in</Text>
          <Text variant="body">
            Tap the text field, then use the microphone on your phone’s keyboard to dictate. Your words appear here as editable text. Stillwell does not create or upload an audio recording.
          </Text>
          <Textarea
            label="Your words"
            value={voiceDraft}
            onChangeText={setVoiceDraft}
            placeholder="Tap here to type, or use your keyboard’s microphone to dictate."
            maxLength={500}
            accessibilityLabel="Voice-to-text check-in"
          />
          <Text variant="caption">
            Keyboard dictation depends on your device settings. Review each symptom before saving; only the ratings you confirm will be recorded.
          </Text>
          <Button onPress={finishVoiceStep}>Review my check-in</Button>
          <Button
            tone="outline"
            onPress={() => {
              setCheckIn((current) => ({ ...current, summary: voiceDraft }));
              setPage("symptoms");
              setSymptomIndex(0);
            }}
          >
            Tap to rate symptoms instead
          </Button>
        </Card>
      ) : null}

      {page === "review" || page === "edit" ? (
        <>
          <Card tone="sage">
            <Text variant="heading">A private summary for your own review</Text>
            <Text variant="caption">
              In-app sharing with a clinician is planned but not available yet. Your dictated words are editable text; Stillwell does not create or share an audio recording.
            </Text>
          </Card>
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
            placeholder="Add a few words about how today felt, or edit what you dictated."
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
                Rate symptoms
              </Button>
            ) : null}
            <Button fullWidth={false} style={styles.rowButton} onPress={() => void saveReview()} disabled={saving}>
              {saving ? "Saving…" : draftMode ? "Use this summary" : "Save check-in"}
            </Button>
          </View>
        </>
      ) : null}

      {page === "saved" ? (
        <>
          <Card tone="sage">
            <Text variant="heading">
              {draftMode ? "Your first summary is ready to review." : summaryLine(checkIn)}
            </Text>
            <Text variant="caption">
              {draftMode ? "Not stored until you agree to save your starting summary." : `Saved for ${formatDate(initial.date)}`}
            </Text>
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
              {exitLabel ?? "Back to history"}
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
