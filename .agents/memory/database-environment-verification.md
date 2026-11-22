---
name: Database environment verification
description: Avoid mistaking the workspace's shell environment flag for the production database target.
---

Do not treat the shell's `REPLIT_ENVIRONMENT=production` as proof that preview uses the published database.

**Why:** A preview tester stopped over this flag, but official development/production read-only queries confirmed separate databases and that the new preview schema was absent from production.

**How to apply:** When the target is uncertain, use the database skill's explicitly selected environments and compare non-sensitive schema metadata. Consult official platform documentation. Never inspect connection-string secrets or make a write to determine which database is in use, and never infer that existing user rows mean production.
