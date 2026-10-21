# Stillwell Recovery

Self-guided concussion and post-concussive recovery journaling, with optional clinician involvement.

## Run & Operate

- Managed workflows run the website and shared API; restart the existing artifact workflows, not duplicate servers.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/website` (`@workspace/website`) — patient landing page, starting quiz, sign-in/up, private journal/dashboard, and privacy page. Patient routes remain at `/`, `/quiz`, `/dashboard`, and `/privacy`; clinician links hand off to `/clinicians`.
- `artifacts/clinicians` (`@workspace/clinicians`) — separate clinician portal web app mounted at `/clinicians`, with a public landing page, shared Clerk sign-in/up, private clinician profile setup/editing, dashboard, and draft privacy/terms pages. Run with `pnpm --filter @workspace/clinicians run dev`.
- `artifacts/stillwell-phone` (`@workspace/stillwell-phone`) — Expo app for iOS and Android with the patient journal plus a clinician role switch, clinician profile setup, and a private clinician home. Run with `pnpm --filter @workspace/stillwell-phone run dev`, then open the Expo workflow preview or scan its QR code with Expo Go.
- `artifacts/api-server` — shared API, still served at `/api`.
- `artifacts/stillwell-design-system` — reusable Stillwell tokens and components; `artifacts/mockup-sandbox` holds design explorations.
- `design/` — separate imported design exports; not another application.
- Website workflow: `artifacts/website: web`, running `pnpm --filter @workspace/website run dev`. Production builds use the same package and serve `artifacts/website/dist/public`.
- Clinician portal workflow: `artifacts/clinicians: web`. It uses the same Clerk tenant, account-role API, Postgres database, and Stillwell design system as the patient website.
- The website keeps its original stable artifact ID for canvas links; folder and package names do not determine public URLs.
- GitHub source control uses one repository, `scc-grl/stillwell`, with the website, phone app, API, and design system in separate folders at the repository root; keep those folders in sync with this workspace.

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Account types and clinician portal

- `account_roles` is the source of truth for patient vs clinician; legacy accounts without a role default to patient. Both web apps use the same Clerk accounts.
- Patients use the website or phone journal. Clinicians can sign in on either, manage their professional profile, and use the new backend-only care-team API for authorized read-only sharing. Patient-owned recovery APIs still reject all clinician accounts.
- Care-team backend routes live under `/api/patient/care-team` and `/api/clinician/care-team`; the phone patient Account includes outbound invitations and access management. Clinician requests and clinician-side care-team screens are deferred. Old sharing URLs still return `410` and their obsolete handlers have been removed. Legacy generated hooks remain for source compatibility, not as working sharing APIs.
- Clinician matching/directory, licence verification, real-time alerts, and partnership intake remain planned and blocked. Care-team acceptance does not verify a clinician's professional credentials.
- The clinician profile is owned by the authenticated Clerk user. The user can save private preferences for future listing, but those preferences do not create a public listing or patient connection.

## Product

The phone journal flow is the standard for both web and mobile: the same starting setup, six-symptom four-step check-in, separate food/movement/pacing log, routines, and history. Shared journal definitions and legacy-score conversion live in `lib/recovery-journal`; do not duplicate scales or weekly-pattern logic in an app.

Daily entry saves are section-specific (`check_in` or `activities`) and atomically merge into the latest saved day so edits on one device preserve the other section. Skipped symptoms are not recorded, never inferred. Voice-to-text uses the device's keyboard/browser dictation; Stillwell does not record audio.

Public landing → starting quiz → explicit storage consent → email-based account creation → first saved summary and private daily journal. Users can edit routine priorities, log symptoms and food/movement/meditation/pacing, edit or delete individual days, and delete all recovery data without deleting their sign-in account.

## Health-data safety

- Personalization means user-chosen educational routines, not diagnosis or prescribed treatment. No supplement doses or individualized exercise intensity/progression.
- Every recovery API derives ownership from the authenticated Clerk user; never trust a client-supplied owner.
- Never send health fields, notes, symptom choices, or account identifiers to analytics or logs.
- A quiz draft is kept in memory before consent; after explicit consent, keep the mobile draft only in secure storage and the website draft only in tab session storage, for up to 30 minutes. Clear it after save, cancellation, logout, or account change.
- Keep emergency/new-injury boundaries visible. Do not claim HIPAA compliance or end-to-end encryption.
- Care-team consent grants full journal history read-only. Only a matching verified account email can accept; all ownership comes from Clerk, never request-body owner IDs.
- Disconnecting or deleting all recovery data freezes the current profile preferences and all entries into clinician-owned snapshots. Later edits/deletions cannot change those snapshots. Reconnecting creates a new link. The clinician alone can delete their former link and snapshot.
- Journal writes and snapshot capture share a patient-scoped transaction lock. Do not add new journal-write paths without the same lock.

## Care-team backend operations

- Development schema: `care_team_invites`, `care_team_links`, `care_team_snapshots`, and `care_team_email_sends`. The old `patient_clinician_connections` table was empty when checked and is retained inert; no legacy data was removed.
- Patient limit: 5 pending invitations plus active links; 10 outgoing invite sends/resends per UTC day. Clinician limit: 20 outgoing request sends/resends per UTC day. Resends wait 10 minutes and rotate the token with a fresh 14-day expiry. Email send counters survive cancellation and patient delete-all.
- Only SHA-256 token digests are stored. All care-team responses are `private, no-store`; token and connection paths are redacted from request logs. No care-team analytics are emitted.
- Email: optional `EMAIL_API_KEY` enables Resend; then `EMAIL_FROM` and `CARE_TEAM_WEBSITE_URL` (the trusted HTTPS website origin) are required, with optional `EMAIL_REPLY_TO`. No provider key means no delivery and only `invite email suppressed` is logged. Suppressed accept/review links appear in responses only when `NODE_ENV=development`.
- Website links are `/invite/:token` and `/request/:token`; their pages are intentionally not built in this backend-only phase. Use the generated API hooks or direct API calls in preview until UI integration.
- `pnpm --filter @workspace/api-server test` includes PostgreSQL integration tests in an isolated temporary schema, removed after the run. It requires the development `DATABASE_URL` and never contacts Clerk or sends real email.
- The phone patient's Account screen now includes care-team invite, resend, cancel/Undo, expired removal, and disconnect controls. Clinician-to-patient request screens are deferred to the next phase. The invite form is transient only; tapping Send provides sharing consent with the full-history/retained-snapshot disclosure.
- `GET /api/patient/care-team` includes server time and daily send quota for accurate phone controls. `DELETE .../invites/:id` also removes expired invitations. `POST .../invites/:id/undo-cancel` restores the original recently cancelled invitation without sending email; UI Undo lasts 5 seconds, with a 10-second server window for network latency. All limits and owner checks still apply.
- Development Expo web preview requests are admitted only from this workspace's configured HTTPS Expo host with an explicit Clerk bearer token. Cookie requests remain same-origin and production origin behavior is unchanged. This is not an authentication bypass.
- Run phone care-team helper tests with `pnpm --filter @workspace/stillwell-phone test`. Suppressed email is clearly marked as preview-only in the phone UI; the development token link is selectable only within that signed-in preview and never persisted.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
