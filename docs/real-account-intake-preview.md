# Real-account intake: patient-written preview

Implements the updated founder-approved preview scope for [issue #41](https://github.com/scc-grl/stillwell/issues/41), on PR #42. The original synthetic-only restriction has been replaced by patient-written stories in the signed-in preview. No merge or publishing is authorized.

## Privacy boundary

Consent is recorded on our server before any story goes to TypeSafe. Patients can type or use browser/OS voice-to-text; Stillwell receives text, not audio. The server permits only story text and allowlisted numeric/enum intake answers. Account profile/name/email/phone/ID/date-of-birth fields are never copied to the AI request. The authenticated owner is used only locally to match consent and store the result.

Before sending, a basic server-side filter removes obvious email addresses and common phone-number formats. **This is not full de-identification.** Names, dates of birth, addresses and identifying context typed in the story can remain; the UI asks patients to avoid them. No BAA or compliance status is claimed.

The private runner has no Braintrust dependency, spans or logging calls; SDK logging/instrumentation stays off. Raw story text is not stored, traced, put into URLs or browser storage, or included in logs. In-memory story state remains available while reviewing/retrying, and is discarded on leaving the flow. Exceptions are returned as fixed messages, never SDK bodies.

Existing public `/demo/intake` remains separate, unauthenticated, rate-limited and non-persistent. This follow-up does not change its behavior, UI or tracing. Braintrust evals continue to use curated synthetic examples only; no account intake result is added to the dataset.

### Server setting / emergency off switch

`REAL_ACCOUNT_INTAKE_ENABLED=true` is set in the **development** environment only. Unset or `false` disables new consent and reading, including existing consent sessions; history stays readable in preview. Set the environment value and restart `artifacts/api-server: API Server` for it to take effect—no code change is needed. The gate is checked before the reader and again before saving a result.

The guard also requires `NODE_ENV=development` or `test`: production remains blocked even if the setting is true. Do not enable production, merge or publish as part of this preview.

## Flow and storage

- `/dashboard/intake`: patient-role gate, consent, typed/dictated story, reading, summary / structured fallback, starting-stage result or safety exit.
- `GET /api/recovery/intake/status`: signed-in patient only, reports the server's enabled state, no account fields.
- `POST /api/recovery/intake/consent`: records the authenticated owner's consent version and server time before reading.
- `POST /api/recovery/intake`: checks ownership, current consent version and 24-hour lifetime, validates a nonblank story up to 4,000 characters and numeric/enum answers, filters contacts, then invokes the same shared reader/rules as the demo **without demo tracing**. Maximum ten attempts per owner per hour.
- `GET /api/recovery/stages`: returns only the authenticated patient's stage history.
- Existing PR tables: `recovery_intake_consents`, `recovery_intake_attempts`, `recovery_stages`. This follow-up needs no schema change/migration.
- Only `start_journal` creates a provisional stage. Safety exits / tap-confirmation create no stage. Stage rows retain reasons, rule IDs/version, source, synthetic marker and confirmation fields; duplicate retries within a consent session do not duplicate the same decision.
- Stored status is `provisional` (the issue's data-model enum); the UI presents that as “Pending clinician review”. There is no separate stored `pending_review` enum.
- New consent version `intake-consent-2026-11-09.2` and `synthetic_only=false` are required: a previous synthetic-session consent cannot authorize sending a personal story. New stages carry `syntheticOnly=false`; old synthetic rows remain marked and are excluded from the personal-stage card.
- Clinician review is not a running delivery service yet; pending does not promise an actual response within 24 hours.
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

The updated workspace typecheck passes; the full suite has **240 passing tests, zero failures** (API 95, website 28, phone 25, intake library 25, journal library 50, scripts 8, other packages 9). This follow-up adds coverage for the actual TypeSafe request envelope (story/questions only, no account fields), contact filtering and preservation of injury dates, strict answer fields, the feature switch including in-flight shutdown, consent ownership/version and safety outcomes. Website checks also cover consent-before-editor mounting, dictation limits/cleanup and discarding state on account changes. All fixtures and eval inputs remain synthetic.

The live Braintrust eval reached an empty dataset (zero rows); no accuracy scores are claimed:
https://www.braintrust.dev/app/scc-grl/p/stillwell-intake/experiments/intake-rules-2026-11-09.1

No publishing or production database changes were performed. Patient-written intake is enabled only in preview; actual clinician alerts and queue delivery remain deferred.

### Patient-written preview browser pass

Using a fabricated patient identity and fabricated narrative with fake contact details, verified enabled status, unchecked consent disabling Continue, no story/microphone controls before consent, consent POST 201, blank editable story after consent, successful story POST 200, Summary, explicit confirmation, and persisted provisional Stage 1 after dashboard reload. The basic-filter limitation was visible. A narrow dashboard had no horizontal overflow; test recovery data was deleted and the session signed out.

The dashboard briefly received HTTP 401 responses after the flow; one reload restored the session and displayed the saved stage. This was not established as an application bug, and auth code was not changed in response. A distinct Reading frame was too brief to observe. The runtime browser recorder did not expose its captured body-key array correctly; the actual SDK request envelope is verified by the automated mock-client test instead.

Physical microphone/browser dictation, the SpeechRecognition mock, and the symptom Change rerun were not exercised in this browser pass. Dictation lifecycle/limits and structured answer submission have code-level checks; no device-level speech recognition guarantee is claimed. The test sign-in account may remain because the approved test helper does not delete accounts.

### Original synthetic-preview browser pass (historical)

Verified consent disabled until checked, Not now returning without consent, fixed samples with personal text disabled, the real TypeSafe reading path, an 11-symptom Summary, explicit confirmation, provisional Stage 1 and reasons, and the persisted synthetic stage on the dashboard after reload. The work sample was used for the normal path; the conservative safety rules can send Maya's sample to the emergency outcome.

The emergency sample displayed a button-free warning and added no stage. The stage view fit a 390×844 viewport without horizontal overflow; dashboard dark mode was checked. Delete-all removed the synthetic stage, and the test session was signed out.

The numeric symptom Change picker showed 0–10, but a Vite reconnect interrupted the rerun. Its final request/result was not browser-verified; structured-answer validation and reader-domain conversion are covered by automated tests. Consent-row cleanup was not independently inspected after delete-all. The Clerk test sign-in account may remain because the approved test helper does not provide account deletion.
