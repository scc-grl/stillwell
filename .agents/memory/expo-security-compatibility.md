---
name: Expo security compatibility
description: Scope and verification of dependency-only security maintenance in the native workspace.
---

Keep security-only maintenance within the current Expo SDK when possible. Prefer
narrow, tested compatibility measures for unpatched transitive dependencies over
an unrelated SDK migration.

**Why:** Expo's tooling can retain older transitive APIs even after the affected
package publishes a secure version. A clean audit and successful TypeScript
check do not prove CommonJS/ESM interoperability in Metro, and an SDK migration
would require a separate native compatibility assessment.

**How to apply:** Check the actual APIs used by the parent before overriding a
dependency, retain explicit regression tests for any adapter, and verify both
iOS and Android bundle exports. Remove compatibility measures once upstream
supports the safe dependency directly.
