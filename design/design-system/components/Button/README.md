Pill-shaped buttons for the one main action on a screen, quiet back links, destructive deletes and small toggle chips.

**When to use.** One `primary` button per screen, bottom-right of the panel, with a trailing arrow when it moves the person forward ("Continue", "Accept & save first summary"). Use the ghost style for "Back" and "Leave setup". Use `destructive` only for deleting a day or all recovery data, always behind a confirmation. Use chips for small on/off choices inside a card ("Add if useful" / "Tracking", "It fit" / "Not today" / "Not planned").

**Appearance.** Primary: `primary` fill, `primary-foreground` label in `button`, `radius-pill`, at least `space-12` tall, `space-6` side padding; hover `primary-hover`; disabled at 45% opacity. Ghost: no fill, `muted-foreground` label. Chip: 11px `micro` label, `choice-border` outline; pressed chips switch to `secondary` fill with `progress-fill` border and expose `aria-pressed`.

**What the consumer provides.** The label text (sentence case, an offer not a command), an optional Lucide icon, and `onClick` or `asChild` for links. In code the package component keeps shadcn's API: `variant` (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) and `size` (`default`, `sm`, `lg`, `icon`).

**Don't.** Put two primary buttons side by side, use green for decoration, or write pressure copy ("Don't break your streak").

Source: `components/ui/button.tsx` plus the rendered pill styles in `QuizPage.tsx`. The preview is a static rendition.
