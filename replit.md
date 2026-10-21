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
- `lib/clinician-care-portal` (`@workspace/clinician-care-portal`) — shared read-only clinician care UI, rendered by the website at canonical `/clinician/portal`, `/clinician/patients/:id`, and `/clinician/patients/:id/days/:date` routes. IDs are owned care-link IDs, never patient user IDs. `/clinicians/dashboard` redirects to this portal; professional profile and auth stay under `/clinicians`.
- `artifacts/stillwell-phone` (`@workspace/stillwell-phone`) — Expo app for iOS and Android with the patient journal plus a clinician role switch, clinician profile setup, and a private clinician home. Run with `pnpm --filter @workspace/stillwell-phone run dev`, then open the Expo workflow preview or scan its QR code with Expo Go.
- `artifacts/api-server` — shared API, still served at `/api`.
- `artifacts/stillwell-design-system` — reusable Stillwell tokens and components; `artifacts/mockup-sandbox` holds design explorations.
- `design/` — separate imported design exports; not another application.
- Website workflow: `artifacts/website: web`, running `pnpm --filter @workspace/website run dev`. Production builds use the same package and serve `artifacts/website/dist/public`.
- Clinician portal workflow: `artifacts/clinicians: web`. It uses the same Clerk tenant, account-role API, Postgres database, and Stillwell design system as the patient website.
- The website keeps its original stable artifact ID for canvas links; folder and package names do not determine public URLs.
- GitHub source control uses one repository, `scc-grl/stillwell`, with the website, phone app, API, and design system in separate folders at the repository root; keep those folders in sync with this workspace.

## Architecture decisions

- The care portal uses singular canonical `/clinician` URLs without moving the existing plural `/clinicians` front door or changing patient routes. Its UI is a shared library because workspace artifacts are leaf packages and must not import one another.
- Shared React UI must use the hosting app's React, Clerk, query-client and router instances. The web packages have differing installed peer versions; keep singleton deduplication in both web apps to avoid losing auth context.
- Keep the care portal mounted across its selection/day URLs so short-lived feedback survives navigation. Reserve inline-validation space: removing a blur error must not shift the submit button between pointer down and up.
- The care portal follows OS appearance. Its HTML dark class is scoped to the portal's lifetime and restored on exit, so portalled dialogs/menus inherit Stillwell dark tokens without changing the patient site's theme behavior.

## Account types and clinician portal

- `account_roles` is the source of truth for patient vs clinician; legacy accounts without a role default to patient. Both web apps use the same Clerk accounts.
- Patients use the website or phone journal. Clinicians can sign in on either and manage their professional profile; the website care portal reads shared journals through the authorized care-team API. Patient-owned recovery APIs still reject all clinician accounts.
- Care-team backend routes live under `/api/patient/care-team` and `/api/clinician/care-team`; the phone patient Account includes outbound invitations and access management. Website `/invite/:token` accepts clinician invitations and opens the exact shared journal with a permission-checked toast; `/request/:token` mirrors patient request review on the phone. Website care-team controls sit on Dashboard → Your care team. Old sharing API URLs still return `410`; legacy generated hooks remain for source compatibility, not as working APIs.
- The clinician website provides active/former lists, outgoing requests, read-only symptoms/history/day views, and permanent deletion of the clinician's own former snapshot. A disconnect returns the same link as a frozen journal, not a new permission grant. Reads refresh on focus/mount and poll every 60 seconds. Full-history statistics load all API pages, restarting if the opaque journal revision changes. Each server page uses a read-only repeatable-read transaction; the revision covers the profile and all entry content, not only the newest edit timestamp. Never log the revision. Daily rows are revealed 20 at a time; incomplete or continually changing reads fail explicitly rather than returning partial history.
- Clinician tables show the seven stored 0–10 severities, not reconstructed 0–3 answers. Missing values remain unrecorded. Both daily notes and check-in summaries are retained in the reader. The shared parser is `@workspace/recovery-journal/clinician-journal`; patient entry flows still use the six-symptom, four-step standard.
- Clinician matching/directory, licence verification, real-time alerts, and partnership intake remain planned and blocked. Care-team acceptance does not verify a clinician's professional credentials.
- The clinician profile is owned by the authenticated Clerk user. The user can save private preferences for future listing, but those preferences do not create a public listing or patient connection.

## Product

The phone journal flow is the standard for both web and mobile: the same starting setup, six-symptom four-step check-in, separate food/movement/pacing log, routines, and history. Shared journal definitions and legacy-score conversion live in `lib/recovery-journal`; do not duplicate scales or weekly-pattern logic in an app.

Daily entry saves are section-specific (`check_in` or `activities`) and atomically merge into the latest saved day so edits on one device preserve the other section. Skipped symptoms are not recorded, never inferred. Voice-to-text uses the device's keyboard/browser dictation; Stillwell does not record audio.

Public landing → starting quiz → explicit storage consent → email-based account creation → first saved summary and private daily journal. Users can edit routine priorities, log symptoms and food/movement/meditation/pacing, edit or delete individual days, and delete all recovery data without deleting their sign-in account.

## Health-data safety

- **Why consistent reads matter:** edits, deletions and profile changes can happen between queries or pages without changing the entry count or latest timestamp. Keep authorization, profile, totals and entries in one database snapshot per page, and compare the complete version fingerprint across pages.
- Public sharing disclosures are in the website landing page and `/privacy`; new care-team privacy text is marked `FOUNDER LEGAL REVIEW` in source. Send/Share consent, whole-history sharing, the five-clinician limit and retained former copies must stay consistent with the API. Patient invite emails use first names only and do not name the condition; clinician requests identify the clinician by the name the clinician entered on their account (Stillwell doesn't verify it), never the patient's last name or journal content.

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
- Website links are `/invite/:token` and `/request/:token`. Public previews expose minimal name/masked-email/date/state metadata only. `GET /api/care-team/invites/:token/preview` provides invitation context; `GET /api/clinician/care-team/invites/:token` checks clinician role and verified invited email before automatic acceptance. Patient requests always require an explicit Share; setup and email verification never grant patient access.
- Web authentication handoffs use tab-scoped session storage for at most 30 minutes, cleared on completion/cancel/ordinary logout or account change. Explicit account switching preserves only the token. Cross-artifact accepted-invite notices contain only an opaque owned link ID and a two-minute expiry, never names, emails or tokens. Storage-blocked browsers receive a visible explanation before authentication navigation. The phone's pending request remains memory-only.
- Invitations retain an optional `accepted_link_id` pointing at their original authorized connection. This continues to identify a frozen former snapshot after disconnect; deleting that snapshot nulls the reference. Do not infer a former connection from names or timestamps, or silently substitute a later connection. Legacy consumed invitations without a reference show an honest already-used fallback.
- Bearer-link and clinician journal responses use private/no-store where handled by the API server, plus early HTML no-referrer/noindex guards on the static website. These guards cover direct/client-side token navigation, private clinician URLs (including link IDs and day dates), and pending authentication; they block off-origin analytics connections before tracking, without configuring Replit's injected tracker. Browser Clerk SDK telemetry and custom events are disabled during these flows; account/portal handoffs never put tokens in auth query strings.
- `pnpm --filter @workspace/api-server test` includes PostgreSQL integration tests in an isolated temporary schema, removed after the run. It requires the development `DATABASE_URL` and never contacts Clerk or sends real email.
- The phone patient's Account screen includes care-team invite, resend, cancel/Undo, expired removal, and disconnect controls. The invite form is transient only; tapping Send provides sharing consent with the full-history/retained-snapshot disclosure.
- `GET /api/patient/care-team` includes server time and daily send quota for accurate phone controls. `DELETE .../invites/:id` also removes expired invitations. `POST .../invites/:id/undo-cancel` restores the original recently cancelled invitation without sending email; UI Undo lasts 5 seconds, with a 10-second server window for network latency. All limits and owner checks still apply.
- Development Expo web preview requests are admitted only from this workspace's configured HTTPS Expo host with an explicit Clerk bearer token. Cookie requests remain same-origin and production origin behavior is unchanged. This is not an authentication bypass.
- Run phone care-team helper tests with `pnpm --filter @workspace/stillwell-phone test`. Suppressed email is clearly marked as preview-only in the phone UI; the development token link is selectable only within that signed-in preview and never persisted.
- Preview invite wording and token panels have hard `__DEV__` guards. In production, suppressed delivery shows an honest no-email-sent error, never a development link or a false sent confirmation.
- Phone `/request/:token` (including the existing `stillwell-phone://request/:token` scheme) handles sign-in, new-patient setup, explicit review/Share, Not now, and request edge states. The pending token and typed request email stay in memory only; ordinary logout/cancel clears them, while an explicit account switch preserves only the token. App restart requires reopening the email link. Setup and email verification never accept a request automatically; Not now dismisses locally without a mutation or notification.
- `GET /api/care-team/requests/:token/preview` returns only clinician name, masked recipient email, request/expiry dates and state, with private/no-store caching. Full clinician contact details (including expired-request invite prefill) are returned only after patient-role and matching verified-email checks. Public and authenticated request token paths are redacted from access logs.
- HTTPS request links have a website fallback. Verified installed-app opening still requires real iOS bundle/team identifiers and Android package/signing fingerprints; these release details are not configured, so do not invent association files. Use the Expo Go deep-link URL or configured custom scheme in development.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
