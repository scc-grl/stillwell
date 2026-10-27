# Stillwell

Stillwell is a private, self-guided recovery journal for concussion and post-concussive symptoms, with optional clinician support. Live at [stillwell-mvp-care-app.replit.app](https://stillwell-mvp-care-app.replit.app).

This repository mirrors the Replit project **Concussion Care Prototypes**. Replit is where code is built, run and published; GitHub is the permanent record of the code, designs and decisions.

## What's where

```
design/                      Claude Design exports and the Stillwell design system
artifacts/
  website/                   The website: landing page, starting quiz, private journal, privacy page
  api-server/                Shared backend that saves and loads each person's journal
  stillwell-design-system/   Shared colours, type and components
  mockup-sandbox/            Design explorations (not published)
lib/                         Shared database layout and API definitions
scripts/                     Workspace helper scripts
replit.md                    Notes Replit Agent reads before building
```

Each product gets its own folder under `artifacts/`. A future phone app will sit next to `website/` (for example `artifacts/mobile-app/`) and share the API, database layout and design system with it, so one person's journal appears in both.

## How changes happen

1. **Design** — visual changes are designed in Claude Design using the Stillwell design system, then exported to `design/exports/` (named `YYYY-MM-DD_screen-name`).
2. **Build** — code is changed in Replit only, by Replit Agent working from the design and a written spec. Code is not edited directly on GitHub.
3. **Review** — the change is checked in Replit's preview against the design system and Stillwell's safety rules before publishing.
4. **Publish** — publishing in Replit updates the live site.
5. **Sync** — pull from GitHub before starting work in Replit; push to GitHub when finished. Both are buttons in Replit's Git pane.

## Ground rules

- Stillwell is educational and user-led. It does not diagnose or prescribe treatment. No supplement content or recommendations. It does not set exercise intensity or progression.
- The emergency and new-injury boundary stays visible wherever symptoms are recorded.
- Health data, notes and symptom choices never go to analytics or logs. Stillwell does not claim HIPAA compliance or end-to-end encryption.
- Secrets (database URLs, API keys, tokens) live in Replit Secrets, never in this repository.
