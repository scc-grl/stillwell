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

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

Public landing → starting quiz → explicit storage consent → email-based account creation → first saved summary and private daily journal. Users can edit routine priorities, log symptoms and food/movement/meditation/pacing, edit or delete individual days, and delete all recovery data without deleting their sign-in account.

## Health-data safety

- Personalization means user-chosen educational routines, not diagnosis or prescribed treatment. No supplement doses or individualized exercise intensity/progression.
- Every recovery API derives ownership from the authenticated Clerk user; never trust a client-supplied owner.
- Never send health fields, notes, symptom choices, or account identifiers to analytics or logs.
- A quiz draft is kept in memory before consent; only a consented draft may be held in tab session storage for up to 30 minutes during signup. Clear it after save, cancellation, logout, or account change.
- Keep emergency/new-injury boundaries visible. Do not claim HIPAA compliance or end-to-end encryption.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
