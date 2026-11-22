---
name: Account intake privacy boundary
description: Founder approved patient-written stories in production behind a switch, without account metadata.
---
The founder explicitly approved signed-in patients typing or dictating their own story in preview and production, after server-recorded consent, with a server-side on/off setting. TypeSafe may receive only story text and structured intake answers, never account profile fields or identifiers.

**Why:** After reviewing the preview, the founder said patients' own story text and answers should go to TypeSafe on the live site, without account fields. No new BAA or compliance status was stated.

**How to apply:** Preserve consent-first, basic server-side email/phone filtering (not full de-identification), no story logging/tracing, synthetic-only tests/evals, and the server-side kill switch. Production use is approved when enabled; PR merges and publishing still need approval.
