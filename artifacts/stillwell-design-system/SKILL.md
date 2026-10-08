---
name: Stillwell visual language
description: Source-derived design conventions for reusable Stillwell surfaces
---

# Stillwell design language

Source: sibling Stillwell Recovery current App.tsx, QuizPage.tsx, DashboardPage.tsx and index.css. No separate written brand manual was present. The following conventions are observed in its rendered structures, not invented brand policy.

- Use warm paper for the page, off-white for cards and botanical green for primary actions. Clay is a supporting accent.
- Fraunces carries expressive headings; DM Sans carries interface text and body copy. Small uppercase section labels use wide tracking.
- Buttons are pills; panels use soft 24–30px corners. Fields use smaller 12px corners. Layout spacing uses a 4px base with generous desktop sections and single-column mobile forms.
- Shadows are low-opacity and borders are restrained. Preserve visible focus, disabled controls and explicit labels.
- Voice is calm, optional and user-led; avoid pressure, streaks or diagnostic claims. This is seen in source CTA and safety copy.
- Source declares dark token values, but product pages are light-only in practice. The library dark rendering is labeled derived.

## Package contracts

Edit tokens.json, not generated CSS/TSX. Read docs/AGENTS.md and docs/references/component-inventory.md. Five implemented families: button, card, input, textarea, checkbox. Other families await pilot approval; do not claim they ship or migrate the app until the catalog is complete. The recovery app is deliberately unchanged.
