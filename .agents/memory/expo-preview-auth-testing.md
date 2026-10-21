---
name: Expo preview authentication testing
description: A successful root-host Clerk test sign-in does not establish a session on the separate Expo preview host.
---

Confirm that the Expo preview itself is signed in before treating programmatic Clerk test login as successful.

**Why:** The test helper returned a successful redirect on the root development host, but the separate Expo preview host still displayed the signed-out welcome screen. The protected dashboard could not be visually or interactively verified through that session.

**How to apply:** Check the actual phone preview's authenticated state. If the helper cannot establish it, report the verification limitation instead of claiming dashboard coverage or weakening authentication to make a test pass.

The Expo browser preview is also a distinct origin for API requests, unlike Expo Go's native HTTP client.

**Why:** An authenticated Expo browser session can still receive origin-guard failures even when the same account works on the website or in Expo Go.

**How to apply:** Preserve Clerk authentication and same-origin cookie protections. Permit only the configured development HTTPS Expo host with bearer authentication; never permit arbitrary origins or weaken production protections to make preview work.

A host-local programmatic Clerk test signup can also be blocked by Smart CAPTCHA when its UI element is not mounted.

**Why:** The supported test-email signup attempt in the actual Expo browser failed with a missing CAPTCHA element and Turnstile failure, without establishing a session.

**How to apply:** Do not disable CAPTCHA or add a test-only auth bypass. Report signed-in coverage as unverified if neither the supported helper nor a legitimate host-local session works; a signed-out screenshot is not care-team flow verification.
