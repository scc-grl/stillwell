Surfaces that hold Stillwell content: the page panel, selectable choice cards, info notes and the emergency boundary notice.

**When to use.** Each page has one panel (`card` fill, `border` hairline, `radius-panel`, `shadow-panel`, `space-5` padding on phones and `space-8` on desktop). Inside it, use choice cards (`radius-choice`) for options a person selects, an info note (`secondary` fill, `radius-inner`) for gentle guidance, and the boundary notice (`notice` surfaces) wherever symptoms are recorded.

**States.** Choice cards rest on `choice-border`, hover to `choice-border-hover`, and when selected take `secondary` fill, `selected-border` and a check icon. Selection must never rely on colour alone.

**What the consumer provides.** Content (a `label` title and a `caption` description for choice cards), `aria-pressed` and an `onClick` for choice cards, and the page's eyebrow and heading above the panel. In code the package keeps shadcn's parts: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.

**Don't.** Nest panels, add shadows to inner cards, use coloured left-border accents, or reuse the clay notice for anything but the safety boundary.

Source: `components/ui/card.tsx` plus the rendered panel and choice styles in `QuizPage.tsx`. The preview is a static rendition.
