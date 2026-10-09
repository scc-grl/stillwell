Checkboxes for explicit consent and for picking several routine areas.

**When to use.** The consent step before any health data is stored: a full-width consent row (`field` fill, `choice-border`, `radius-inner`) whose sentence names exactly what is stored and that it can be deleted. For multi-select choice cards, use the round check dot (20px, `radius-pill`), filled `ring` with a check when on.

**Behaviour.** The consent box starts unchecked and the primary action stays disabled until it is checked. Checking it clears any error.

**What the consumer provides.** A label that states the consent in plain language, `checked` and `onChange` (or Radix `checked` / `onCheckedChange` in code), and the disabled state of the action it gates.

**Don't.** Pre-check consent, bundle several consents in one box, or hide what is being agreed to.

Source: `components/ui/checkbox.tsx` plus the rendered consent row and priority dots in `QuizPage.tsx`. The preview is a static rendition.
