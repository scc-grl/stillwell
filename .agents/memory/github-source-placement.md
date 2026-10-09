---
name: GitHub source placement
description: Why the GitHub source folder differs from the live Replit workspace layout.
---

Keep GitHub and the live workspace on the same top-level project layout. Do not recreate the temporary `stillwell-site/` wrapper.

**Why:** The user replaced the earlier wrapper-folder approach with matching GitHub/workspace layouts and normal Git synchronization. The website is named separately to leave room for a future phone app, not to change its routes or behavior.

**How to apply:** Keep the project source at repository root and preserve the separate `design/` exports. Use normal tracked Git operations; if a requested fast-forward cannot be applied cleanly, stop rather than merge or rewrite history. Do not create the phone app until asked.
