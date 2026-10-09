---
name: Artifact rename lifecycle
description: A managed artifact rename can leave an orphaned development server.
---

Stop an artifact's managed workflow before moving its folder.

**Why:** During a folder rename, the platform removed the old workflow and registered the new one, but the previous Vite process stayed alive on the same port. The replacement workflow could not start until that orphaned listener was stopped.

**How to apply:** Preserve the stable artifact ID and validate service metadata at the new location. If startup reports an occupied port, identify the listener and stop only the verified orphan for that artifact; do not change the port or kill unrelated services.
