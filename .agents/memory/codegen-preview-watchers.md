---
name: Codegen and preview watchers
description: Shared API regeneration can temporarily invalidate running web and Expo preview dependency graphs.
---

Restart affected preview workflows after shared API generation finishes if they report missing generated modules or Metro SHA-1 failures despite the generated files existing.

**Why:** Generation replaces shared output directories while preview watchers are active. Metro has retained invalid dependency state after those files were recreated; successful TypeScript checks alone did not clear the preview errors.

**How to apply:** Finish generation and checks first, then restart affected previews once. Do not change imports, authentication, or dependency versions to address this transient watcher state.

A failed generation may already have cleaned the generated output directories. Restore a successful generation before diagnosing preview imports.

**Why:** Orval cleaned outputs before rejecting a new external reference, leaving consumers temporarily without modules even though the schema failure was the actual cause.

**How to apply:** Resolve the schema/parser error first (allowlist trusted local references rather than allowing arbitrary references), regenerate successfully, then address any remaining watcher errors.
