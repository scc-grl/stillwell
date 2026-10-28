---
name: Recovery protocol content
description: Self-guided concussion journal scope, health-data consent, and safety boundaries.
---

Stillwell supports a self-guided, personalized routine with or without clinician involvement. Users track concussion or post-concussive symptoms and document what they did or did not do each day through diet, exercise, and meditation. The user previously chose a working app with saved logs rather than a prototype.

The newer requested design begins with an optional assessment after account creation, then a personalized pick-and-choose protocol, starting with exercise and diet. Users want audio or manual-quiz logs, daily during the first month and weekly thereafter, three exercise milestones they can move through at their own pace, clinician/material resources, and a protocol/record summary they can choose to share with their physician.

**Why:** The user explicitly described this recovery flow and cadence.

**How to apply:** Treat the new flow as the intended design direction, not permission to silently replace the existing working account/logging flow. Integrate an approved prototype only when asked. Support missing/skipped answers without inventing symptom scores; cadence is a logging schedule, not a recovery prediction or medical clearance.

## Design-first product direction

“Focus on the design flow first before we talk about any type of backend capabilities.” The user wants to see the flow, get it right, and iterate before backend discussions.

The phone app visit centers on a patient check-in. The eventual clinician portal/dashboard should help review progress and summarize experiences, bringing quantitative measures and qualitative reflections together so patients and clinicians can recognize meaningful moments in the journey. The user's future vision includes provisioning protocols to medical research to help other patients and further the field.

**Why:** The user explicitly clarified the design-first priority and the patient, clinician, and future research roles.

**How to apply:** Keep iteration on the canvas; do not propose backend integration until the user asks. Distinguish patient-reported changes alongside a routine from evidence that the routine caused those changes. Future research contribution is separate from ordinary journaling and clinician sharing, with separate informed consent rather than automatic reuse of health records.

## Future clinician/supporter connections

The user wants an eventual way for a patient to connect their account with a clinician or another person supporting post-concussion recovery. Future options may include finding someone nearby or remotely, or entering the email of an existing clinician.

**Why:** The user described this as a future product need and chose to preview the workflow before adding backend capabilities.

**How to apply:** Keep matching and linking clearly marked as unavailable until implemented. Do not save or send details entered in the preview. Any future access to recovery records must be patient-controlled.

## Clinician and partner onboarding boundaries

The user requested working clinician account creation and private professional profiles. Licence details are information only, not proof of verification; any future public directory must wait for verification and explicit opt-in. Do not advertise partnership notification emails without a connected mail service. An optional profile invite code does not itself connect accounts or reveal patient data; sharing requires the separate consent-controlled care-team journeys below.

The user later expanded the phone app to let people choose patient or clinician sign-in. Clinicians can create/sign into their account and use a private profile/home in the phone app, while the patient journal remains patient-only.

**Why:** The user approved clinician onboarding and the phone role switch, while keeping directory/credential claims limited; they subsequently authorized patient-controlled care-team linking.

**How to apply:** Keep clinician tools clearly planned where they are not implemented. Do not present profile invite codes as connections. Clinician sessions must never use patient-owned recovery endpoints; any care-team reads must use the separate, authorized sharing routes described below. Configure authorized Stillwell admins separately; never infer admin access from a notification email address.

## Care-team sharing and retention

The user authorized patient-to-clinician invitations and clinician-to-patient requests with explicit patient consent. Clinician journal access is read-only and must be authorized by that clinician's active care-team link or their own former-patient snapshot.

When a patient disconnects, the clinician keeps a frozen copy of the shared journal history and profile summary. Later patient edits, individual-day deletions, and deletion of all recovery data do not change that copy. It is kept until the clinician removes it. Deleting all patient recovery data first disconnects active links with frozen snapshots, then removes patient-side invitations and active links.

**Why:** The user stated the founder decisions: “When a patient disconnects, the patient history is kept by the clinician and doesn't disappear but they will no longer be updated”; frozen copies survive patient deletions and are kept until the clinician removes them.

**How to apply:** Keep snapshot lifetime independent of the live patient profile and journal. Never cascade patient deletion into a clinician-owned snapshot, and never update a former snapshot from current patient data.

## Patient invitation consent

On the patient's phone care-team invite sheet, tapping Send is the sharing consent; do not add a separate consent checkbox.

**Why:** The user explicitly requested Send as consent, with clear disclosure of whole-journal access, read-only access, and the clinician's retained frozen copy after disconnection.

**How to apply:** Keep those disclosures visible before Send and record consent in the API. This does not authorize sharing on draft entry, opening the sheet, or signing in.

The user approved the invitation-restored/removed toasts, the in-flight close guard, and the cooldown fallback and asked to keep them.

**Why:** The user explicitly confirmed Phase 2a looked good and requested these additions be preserved.

**How to apply:** Retain these behaviors in later care-team iterations. Development link panels and “Preview invite created, no email sent” wording must never appear in production builds; missing delivery must still be described honestly.

## Whole-check-in voice direction

The user chose a voice-led route for the whole check-in—symptoms, diet/exercise, and reflection—rather than voice only for the personal reflection.

**Why:** The user explicitly selected “Whole check-in.”

**How to apply:** Design voice guidance throughout the phone flow, preserving a manual alternative and patient review. Keep the current design-only scope; do not interpret this choice as permission to enable microphones, transcription, or backend capabilities.

## Privacy and medical boundaries

Journaling must remain patient-controlled and non-prescriptive.

**Why:** The user wants an ongoing personal recovery journal, not only a clinician-led service preview.

**How to apply:** Save health records only with explicit consent and authenticated, owner-scoped access. Keep symptom choices, health details, free text, and identifiers out of analytics. Self-guided personalization means user-chosen priorities and educational routines, not diagnoses or prescribed treatment. Follow replit.md's health-content exclusions and do not prescribe individualized exercise intensity/progression. Keep urgent-care boundaries clear and encourage appropriate medical review.

The patient journal is for recording the person's own experience, not for displaying recommendations or treatment guidance.

**Why:** The user explicitly asked to keep the journal as a journaling place and remove sleep-routine recommendations from it.

**How to apply:** Keep journal screens focused on optional patient-entered observations and history. Do not add advice or recommendations to those screens unless the user asks.

Journal drafts remain attached to the day they were started and must not be discarded at midnight.

**Why:** The user explicitly required unfinished drafts to be kept as that day's entry.

**How to apply:** Preserve access to unfinished past-day drafts without inventing entries or values for other dates. Deleting all recovery data must also clear the patient's local journal drafts.

Journal calendar dates in URL paths must also be redacted from access logs.

**Why:** Journal timing can reveal health-related activity even when notes and symptom ratings are absent.

**How to apply:** Log generic route patterns rather than date-specific journal paths or authentication resource identifiers.
