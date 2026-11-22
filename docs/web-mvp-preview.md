# Stillwell web MVP preview

Implements issue #44 using the issue's screen table. The linked design canvas was not publicly readable; no visual match to an unavailable canvas is claimed. Do not publish this branch without founder review.

## Preview routes

- `/` — public Home; `/sign-in`, `/sign-up/patient` — existing managed sign-in.
- `/dashboard/intake` — consent, story/dictation, reading, editable summary, safety outcomes or live starting stage.
- `/dashboard` — current live stage, source/reason, weekly progress and guidance.
- `/dashboard/journal` — four 0–10 symptoms, recovery-plan rating, optional private note, review/save/history.
- `/dashboard/account` — sign out, doctor access, recovery-data deletion, separate full account erasure.
- `/dashboard/invite-doctor` — optional invitation.
- `/invite/:token` — verified matching doctor acceptance and patient-specific handoff.
- `/clinician/portal`, `/clinician/patients/:id` — doctor list, scores, stage and override/history.
- Removed legacy public/quiz/request/demo-shell paths redirect Home.

## Decisions and assumptions for review

- Founder-provided weekly heuristics replace the earlier unmeasurable pre-/post-activity rule; these are **not clinically validated**. All thresholds are in the versioned weekly configuration.
- A logged day is an explicitly saved entry. Missing symptom scores or baselines never qualify for move-up. Recovery-plan average uses only answered ratings; no answered ratings means hold.
- Patient timezone is captured with journal saves; UTC applies before one is recorded. Worker catch-up evaluates the latest completed week once, not an invented sequence of changes during prolonged downtime.
- Maintenance is after stage 6; one step back from maintenance returns to stage 6.
- Journal voice input uses device/browser dictation and conservative local parsing of explicit label/number pairs, with patient review. It does not infer symptom ratings from descriptive prose.
- Optional Jev weekly explanations require a separate per-note opt-in. Declining does not affect any numeric check. Only contact-filtered notes and fixed questions go to TypeSafe; no account fields, scores, decisions or raw tracing.
- The structured stage table retains existing status values for source compatibility, but all non-synthetic saved stages are immediately live in the web experience.
- Stage guidance is general educational wording, not clearance for driving, contact sport or high-risk work. Clinical review of guidance, warning copy and jump thresholds is still required.
- Server-side doctor privacy also applies to the legacy clinician reader. Phone and separate clinician-app source files are unchanged; older clients now receive blank patient-note fields rather than confidential notes.

## Deletion and deployment review

Schema additions use the existing Drizzle schema tool: `pnpm --filter @workspace/db run push` against the intended database before serving this code. No existing table is dropped. Development schema was applied; production was not changed.

Full account deletion is retryable across database/Clerk boundaries. It does not pretend these separate systems form one atomic transaction. A provider failure is explicit, retains a retry marker and blocks recovery writes.

One pre-MVP former link in the development database has no retained owner or surviving accepted-invite reference. Old code intentionally erased that owner. It is unsafe to infer ownership from names. For accounts that could predate an unattributable copy, deletion stops **before removing anything** until an audited mapping is supplied. New accounts created after such a copy are unaffected. No unknown copy was deleted or reassigned.

Former snapshots are immutable on ordinary edits, disconnects and recovery-data deletion, but the founder explicitly requires their deletion on full account erasure. New disconnects retain the erasure reference. Doctor accounts remain.

Before launch: clinically review rules and guidance; review TypeSafe data terms and the optional weekly-note consent; resolve legacy snapshot ownership in the intended environment; verify Resend delivery and periodic worker availability; test real device dictation and screen readers. No compliance, BAA or medical-clearance claim is made.
