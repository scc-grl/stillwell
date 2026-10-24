---
name: Care-team email delivery
description: The approved provider path and consent boundary for care-team email.
---

Use the connected Replit Resend integration for care-team transactional email rather than requiring a Resend API key in project secrets.

**Why:** The user chose to connect Resend through Replit, while care-team invite creation must continue to record consent and a hashed token through the signed-in patient API flow.

**How to apply:** Keep email delivery behind the existing care-team service, require the configured sender address, and never create or send a fabricated invite outside the authenticated flow.

The connected Resend credential is send-only; domain-list requests return `restricted_api_key`. A validation-only `/emails` request confirms the API path responds, but not that delivery works. When diagnosing failures, record only safe provider status/error codes, never recipient or message data.
