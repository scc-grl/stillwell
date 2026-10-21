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

Do not conclude that a user-supplied credential is invalid solely because fetching through an authenticated URL fails.

**Why:** The authenticated-URL fetch failed here, but the same credential succeeded when supplied through a temporary, scoped HTTP authentication header with credential helpers disabled.

**How to apply:** When explicitly authorized to use a stored credential, let the Git process receive it through ephemeral environment configuration. Keep the saved repository URL credential-free, suppress raw authentication output, and never put credentials in files or command arguments. Check the credential-supply method before asking the user to replace a token.

Git repository access does not prove permission to read repository issues.

**Why:** A scoped authenticated fetch succeeded while the issues API returned `403 Resource not accessible by personal access token`, explicitly requiring `issues=read`.

**How to apply:** Check the API's permission response before treating this as a bad token or missing repository. Request Issues read permission on the existing credential, or ask for exported issue content when exact specifications are required.
