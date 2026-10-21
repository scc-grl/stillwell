---
name: Clerk test cleanup
description: Provider-account cleanup can fail even when isolated application fixtures are removed.
---

Track synthetic authentication accounts separately from application database fixtures, and report incomplete provider cleanup explicitly.

**Why:** A supported signed-in browser test could remove its isolated database rows, but Clerk self-deletion returned HTTP 403 for a verified synthetic account. Removing database fixtures alone did not remove the provider accounts.

**How to apply:** Use unique synthetic identities, preserve unrelated accounts and data, and use only supported provider cleanup controls. Do not assume self-deletion succeeds or bypass its restriction with an undocumented administrative path.
