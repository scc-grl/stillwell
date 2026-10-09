# Stillwell — Design

Design work for Stillwell, the virtual care platform for post-concussion recovery and brain health. Designs are made in Claude Design and exported here so they live alongside the prototype code.

## Folders

- **`exports/`** — screens, flows and mockups exported from Claude Design (HTML, PDF or images).
- **`design-system/`** — the Stillwell design system, exported from Claude Design:
  - `README.md` — the style guide: voice, colour, type, spacing, states, motion, imagery and accessibility rules
  - `tokens.json` — the source of truth for every colour, type style, space, radius and shadow
  - `tokens.css` — the same tokens as CSS variables, generated from `tokens.json`
  - `components/` — Button, Card, Checkbox, Input and Textarea: usage notes, static previews, `bundle.css` and prop types
  - `assets/Logos/stillwell-mark.svg` — the Stillwell mark

## Naming exports

Use `YYYY-MM-DD_screen-or-flow-name` so versions sort by date, for example:

```
exports/2026-10-09_onboarding-symptom-check/
exports/2026-10-12_daily-protocol-home.png
```

Keep one folder per screen or flow when an export has several files.

## Workflow

1. Design or revise the screen in Claude Design, using the Stillwell design system.
2. Export it and add it to `exports/` with the naming above.
3. Build or update the screen in the Replit prototype ("Concussion Care Prototypes").
