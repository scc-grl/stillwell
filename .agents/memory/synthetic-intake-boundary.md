---
name: Synthetic intake boundary
description: Founder-approved testing limit while a TypeSafe BAA is absent.
---
Signed-in AI intake must remain synthetic-only and unavailable in production until the founder explicitly approves enabling real patient data after vendor/privacy review.

**Why:** The founder stated that no TypeSafe BAA is in place and chose “Build synthetic-only preview” when offered the alternatives.

**How to apply:** Do not accept editable patient stories or dictation into the signed-in AI preview. Use server-owned fictional scenarios and structured test answers. Do not infer that consent, a working API key, or a later publishing request authorizes lifting this boundary.
