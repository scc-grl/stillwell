---
name: Expo static-build port isolation
description: Run the Stillwell phone static build without colliding with the mockup server or disrupting the live preview.
---

The Stillwell phone static build cannot assume Metro's default port 8081 because the mockup sandbox owns that port in this workspace. It should select an available port, then use that same port for readiness checks, bundles, manifests, and asset URLs. The build should preserve the live app preview's shared Metro cache.

**Why:** A fixed port makes Expo prompt to switch ports and fail in non-interactive builds; clearing the shared cache needlessly affects the running preview.

**How to apply:** When changing the phone build script, keep port selection centralized and avoid stopping the mockup sandbox or phone preview just to build.
