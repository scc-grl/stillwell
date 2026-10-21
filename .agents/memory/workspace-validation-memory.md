---
name: Workspace validation memory
description: Avoid memory exhaustion when checking all web and Expo packages.
---

Run full-workspace validation serially rather than starting multiple TypeScript workers alongside the preview services.

**Why:** Parallel full validation interrupted processes and stopped preview workflows; the container's memory events recorded an OOM kill. Serial validation completed successfully.

**How to apply:** Use `npm_config_workspace_concurrency=1 pnpm run typecheck` and `pnpm -r --workspace-concurrency=1 --if-present test`. Avoid overlapping these with other build processes. If an environment reset interrupts checks, restore the existing managed workflows rather than creating replacement services.
