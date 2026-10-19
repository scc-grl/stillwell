---
name: Expo preview authentication testing
description: A successful root-host Clerk test sign-in does not establish a session on the separate Expo preview host.
---

Confirm that the Expo preview itself is signed in before treating programmatic Clerk test login as successful.

**Why:** The test helper returned a successful redirect on the root development host, but the separate Expo preview host still displayed the signed-out welcome screen. The protected dashboard could not be visually or interactively verified through that session.

**How to apply:** Check the actual phone preview's authenticated state. If the helper cannot establish it, report the verification limitation instead of claiming dashboard coverage or weakening authentication to make a test pass.
