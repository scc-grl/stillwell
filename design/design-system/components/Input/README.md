Single-line text and number fields, always with a visible label above.

**When to use.** Short answers such as email or an optional duration. Use the small numeric style (`radius-sm`, 96px wide) for minutes and other bounded numbers, and say the number is optional and "not a target".

**Appearance.** `field` fill, `input` border, `radius-field`, `body`-size text in `card-foreground`, placeholder in `muted-foreground`, `ring` focus outline. The `input` border is kept from source at 1.3:1, so the visible label and field fill carry the field's edge.

**What the consumer provides.** A `label` element tied by `id`, the input type, optional placeholder and limits (`min`, `max`, `maxLength`), and an error sentence shown below in the error style (`error` surface, `error-foreground` text, `role="alert"`). In code the package keeps native input props.

**Don't.** Use placeholder text as the only label, or validate symptoms as right or wrong.

Source: `components/ui/input.tsx` plus the rendered field styles in `QuizPage.tsx`. The preview is a static rendition.
