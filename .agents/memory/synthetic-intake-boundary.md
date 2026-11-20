---
name: Account intake preview boundary
description: Founder approved patient-written stories in preview, with a server switch and no account metadata.
---
The founder has explicitly replaced the synthetic-only restriction for signed-in preview intake: patients may type or dictate their own story after server-recorded consent. TypeSafe may receive only story text and structured intake answers, never account profile fields or identifiers.

**Why:** After the initial synthetic preview, the founder said to enable patient-written stories in preview, excluding name, email and account ID. No new BAA or compliance status was stated.

**How to apply:** Preserve consent-first, basic server-side email/phone filtering (not full de-identification), no story logging/tracing, synthetic-only tests/evals, and a server-side kill switch. Production enablement, merge and publishing are not approved.
