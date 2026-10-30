# Intake reader and deterministic decisions

Demo/synthetic intake only. TypeSafe reads the note; code chooses the outcome and placement.
No real patient journal integration or publishing is included.

- Questions: `intake-questions-2026-10-29.1`.
- Rules/threshold table: `intake-rules-2026-10-29.2`.
- All 11 symptom IDs come from recovery-journal. Each has a mention Noul and a Score.
- Unmentioned means not recorded. Mention threshold is 0.5. A mentioned symptom's Score confidence below 0.6 requires taps.
- TypeSafe Score answers may be fractional expected positions. Composites use the original fractional value; journal labels use the nearest 0–3 position.
- SDK 0.7 Noul answers expose probability, not independent confidence. If a caller supplies confidence, the `<0.5` safety rule applies. Otherwise `max(p,1-p)` is explicitly marked `binary_probability`, not model-reported confidence. That derived confidence cannot fall below 0.5. The probability safety rule still fires at 0.2.
- Injury timing retains the existing Choice windows. `hoursSinceInjury` is null unless explicitly supplied; the under-48-hours and over-four-weeks windows apply the corresponding caps/prompts without inventing an exact date/hour.
- Optional `answered` uses TypeSafe-compatible structured answers keyed by question ID. Those questions are omitted from the call; the fixed rules still use their answers. Optional `tickedRedFlags` always overrides placement.
- Intake places only stages 1–3. Six shared stage names and next-stage gates are exported. Unknown activity never counts as yes.
- `intakeLogicTrace` records the fixed questions, structured answers, versions, activity bands, composite, rule IDs and result. Raw story, quoted evidence, keyword text, account data and error messages are excluded.

## Braintrust

`pnpm --filter @workspace/scripts run intake-eval` loads project/dataset `stillwell-intake`, org `scc-grl`. It does not fall back to local JSON.
Experiments are named with the rules version. Input text is held in memory and sent only to TypeSafe; opaque dataset row IDs are logged to the experiment.
An empty dataset creates an explicitly blocked attempt with no summary scores.

Supported expected-label aliases (no observed dataset rows to map at implementation time):

| Canonical | Accepted aliases |
| --- | --- |
| outcome | expected_outcome, triage |
| stage | expected_stage, starting_stage |
| danger | red_flag, red_flags (boolean) |
| selfHarm | self_harm |
| symptoms | symptom_ratings (shared IDs; number, null, or `{level}`) |

Outcome aliases: emergency/er → go_to_er; crisis → crisis_support;
see_doctor_first/doctor → find_doctor; confirm/patient_confirms → use_tap_questions;
journal → start_journal. Missing labels are unscored, not assumed correct.
Symptom exact and within-one metrics are emitted separately for each supplied expected rating.

`pnpm --filter @workspace/scripts exec tsx src/intake-online-scorer.ts` idempotently creates a Braintrust scorer and demo-only automation.
It uses no expected answer: a fired red flag with any outcome other than `go_to_er` scores 0; otherwise 1.
The same invariant is recorded immediately on each demo trace as well.
