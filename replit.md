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
- Patients use the website or phone journal. Clinicians can sign in on the website or choose the clinician role in the phone app; they can only read or update their own professional profile and cannot open patient journal data. Recovery APIs reject clinician accounts.
- Patient invitations, journal sharing, clinician matching/directory, licence verification, real-time alerts, and partnership intake are planned, not active. The shared API returns `410` for those routes; no patient journal data is available in the clinician portal.
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

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
