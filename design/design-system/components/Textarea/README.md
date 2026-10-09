Multi-line field for a person's own reflections and notes.

**When to use.** Daily notes, routine reflections and anything the person writes for themselves. Mark it "Optional" in the label and keep placeholders warm and personal ("Your words, for you.", "Optional note for yourself").

**Appearance.** Same field styling as Input: `field` fill, `input` border, `radius-field`, `ring` focus. Minimum height about 90px, resizable vertically. Helper fine print sits below in `micro` and `muted-foreground`.

**What the consumer provides.** A label, `value` and `onChange`, and a `maxLength` (the app uses 2,000 characters). In code the package keeps native textarea props.

**Don't.** Send note contents to analytics or logs; notes are private health data.

Source: `components/ui/textarea.tsx` plus the rendered note fields in `QuizPage.tsx`. The preview is a static rendition.
