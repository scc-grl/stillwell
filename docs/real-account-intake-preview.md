# Real-account intake: synthetic preview

Implements the synthetic-preview scope approved for [issue #41](https://github.com/scc-grl/stillwell/issues/41).

## Privacy boundary

No TypeSafe BAA is in place. The signed-in flow accepts only server-owned fabricated sample stories and validated structured test answers. Personal text and dictation are disabled. Unknown fields such as `note` are rejected before an AI call. This restriction is enforced by the server, not just the UI. New intake/stage routes are unavailable outside `development`/`test`; ordinary recovery routes remain available.

Existing public `/demo/intake` remains separate, unauthenticated, rate-limited and non-persistent. Its existing editable demo behavior is unchanged except for the explicitly requested stage-name and symptom-scale changes. Its warning against entering real health details remains important.

## Flow and storage

- `/dashboard/intake`: patient-role gate, consent, fixed sample, reading, summary / structured fallback, starting-stage result or safety exit.
- `POST /api/recovery/intake/consent`: records the authenticated owner's consent version and server time before reading.
- `POST /api/recovery/intake`: checks ownership, current consent version and 24-hour lifetime; rejects personal text; invokes the same shared reader/rules/tracing allowlist as the demo. Maximum ten attempts per owner per hour.
- `GET /api/recovery/stages`: returns only the authenticated patient's stage history.
- New tables: `recovery_intake_consents`, `recovery_intake_attempts`, `recovery_stages`.
- Only `start_journal` creates a provisional stage. Safety exits / tap-confirmation create no stage. Stage rows retain reasons, rule IDs/version, source, synthetic marker and confirmation fields; duplicate retries within a consent session do not duplicate the same decision.
- Stored status is `provisional` (the issue's data-model enum); the UI presents that as “Pending clinician review”. There is no separate stored `pending_review` enum.
- Synthetic stages are labelled as sample results, not personal medical stages. No clinician receives synthetic alerts. The 24-hour review wording previews the proposed workflow, not a running review service.
- Delete-all removes stage history, consent and attempts; an in-flight AI result cannot recreate deleted stage history.
- Clinician queue and alert delivery remain explicit placeholders for #35.

## Scoring and migration

The shared library uses eleven integer choices, 0–10, with anchors “0 None”, “5 Moderate”, “10 Worst”. Questions and rules are versioned `intake-questions-2026-11-09.2` and `intake-rules-2026-11-09.1`.

TypeSafe rejects rubrics with more than ten criteria. Its ten supported positions (0–9) are linearly normalized to 0–10 in the shared reader; structured patient taps are already 0–10 and are never normalized again. Traces distinguish the original provider position and the normalized journal score.

Previous numerical placement thresholds are scaled by three: counted level 3, severity maximum 7.5 or sum 27, moderate maximum 4.5; timing and probability thresholds are unchanged. These are a mechanical scale conversion, not independently clinically validated thresholds.

New check-ins carry `ratingScale: ten_point_v1`. Unversioned historical check-ins convert 0/1/2/3 → 0/3/6/9. Development migration:

```sh
pnpm --filter @workspace/db run push
NODE_ENV=development pnpm --filter @workspace/db exec node scripts/migrate-journal-ratings.mjs
```

The migration is idempotent and does not modify frozen clinician snapshots or entry edit timestamps. Snapshot rendering performs the same conversion without mutating the original data. Existing legacy `symptoms[].severity` values are already 0–10 and are not multiplied.

Braintrust eval normalizes historical expected symptom positions to 0/3/6/9. New ten-point expected labels must explicitly set `ratingScale: ten_point_v1`; ambiguous higher values without a version are rejected. The existing dataset is not rewritten. The local golden reference remains reference-only.

## Verification

Workspace typecheck and all 232 automated tests passed during implementation. Tests cover consent-before-AI, cross-owner denial, expiry, synthetic input rejection, stage outcomes, rate limiting, retry idempotence, delete-all races, provider-rubric compatibility, scale conversion and migration idempotence/frozen-copy preservation.

The live Braintrust eval reached an empty dataset (zero rows); no accuracy scores are claimed:
https://www.braintrust.dev/app/scc-grl/p/stillwell-intake/experiments/intake-rules-2026-11-09.1

No publishing or production database changes were performed. Real-patient AI intake, voice/free-text entry, actual clinician alerts and queue delivery remain disabled/deferred.

### Signed-in browser pass

Verified consent disabled until checked, Not now returning without consent, fixed samples with personal text disabled, the real TypeSafe reading path, an 11-symptom Summary, explicit confirmation, provisional Stage 1 and reasons, and the persisted synthetic stage on the dashboard after reload. The work sample was used for the normal path; the conservative safety rules can send Maya's sample to the emergency outcome.

The emergency sample displayed a button-free warning and added no stage. The stage view fit a 390×844 viewport without horizontal overflow; dashboard dark mode was checked. Delete-all removed the synthetic stage, and the test session was signed out.

The numeric symptom Change picker showed 0–10, but a Vite reconnect interrupted the rerun. Its final request/result was not browser-verified; structured-answer validation and reader-domain conversion are covered by automated tests. Consent-row cleanup was not independently inspected after delete-all. The Clerk test sign-in account may remain because the approved test helper does not provide account deletion.
