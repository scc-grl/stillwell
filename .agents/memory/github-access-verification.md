---
name: GitHub access verification
description: Distinguish provider authorization, Git authentication, and repository tracking.
---

Verify actual Git access separately from the provider connection status.

**Why:** In this workspace, the GitHub integration reported active and healthy while the GitHub CLI requested authentication and a read-only Git remote query was rejected for invalid credentials.

**How to apply:** Use a read-only remote query to verify access. If authentication fails, follow the integration reauthorization flow. Report remote configuration separately from authenticated access, upstream tracking, and pushing code; never imply that configuring a URL completed all four.

The generic integration authorization card also failed validation for this workspace's Git-provider connection, both with and without reauthorization intent.

**Why:** Git-provider connections were reported active but were not accepted by the generic connector authorization form.

**How to apply:** If that mismatch recurs, stop retrying generic cards and direct the user to Git-provider authorization. Replit's documentation distinguishes account settings → Git Providers from Connected Services; reconnecting only Connected Services does not repair the separate Git connection. Do not ask for credentials in chat.
