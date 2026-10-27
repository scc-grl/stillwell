---
name: Workspace package resolution
description: Shared TypeScript runtime exports and native dependency resolution across pnpm consumers.
---

Shared TypeScript helpers consumed by both direct Node tests and Expo should use package export subpaths for runtime cross-module imports.

**Why:** Explicit `.ts` import paths were rejected by the phone consumer's compiler settings, while extensionless source imports do not resolve in direct Node tests. Package self-references satisfy both without relaxing every consumer's compiler configuration.

**How to apply:** Add a focused package export for a shared runtime module and import through that export. Keep type-only imports erased.

After a filtered pnpm dependency update, check sibling package resolution before assuming a missing-module error means a dependency was never declared.

**Why:** A phone dependency update refreshed peer-store paths while sibling native-library symlinks still pointed at removed instances.

**How to apply:** Reconcile the whole workspace with the existing frozen lockfile before adding duplicate dependencies, changing framework versions, or introducing type casts.
