---
name: Recovery protocol content
description: Self-guided concussion journal scope, health-data consent, and safety boundaries.
---

Stillwell supports a self-guided, personalized routine with or without clinician involvement. Users track concussion or post-concussive symptoms and document what they did or did not do each day through diet, exercise, and meditation. Start with a quiz, then account creation with the first logged summary. The user explicitly chose a working app with saved logs rather than a prototype.

**Why:** The user wants an ongoing personal recovery journal, not only a clinician-led service preview.

**How to apply:** Save health records only with explicit consent and authenticated, owner-scoped access. Keep symptom choices, health details, free text, and identifiers out of analytics. Self-guided personalization means user-chosen priorities and educational routines, not diagnoses or prescribed treatment. Do not recommend supplement products/doses or individualized exercise intensity/progression. Keep urgent-care boundaries clear and encourage appropriate medical review.

Journal calendar dates in URL paths must also be redacted from access logs.

**Why:** Journal timing can reveal health-related activity even when notes and symptom ratings are absent.

**How to apply:** Log generic route patterns rather than date-specific journal paths or authentication resource identifiers.
