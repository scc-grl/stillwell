Stillwell is a private, self-guided recovery journal for concussion and post-concussive symptoms, with optional clinician support. Everything should feel like warm paper and a quiet garden: calm, unhurried and in the user's hands. Build every Stillwell surface from these tokens and rules.

## Content fundamentals

The voice is calm, optional and user-led. The person decides what to track; Stillwell never pushes.

- **Offer, never instruct.** Prefer "Add if useful", "Optional note for yourself", "Leave room to adjust". Avoid "You must", "Don't forget", streaks, scores, goals and countdowns.
- **Second person, plain words.** Speak to "you"; Stillwell refers to itself by name, never "we promise". Sentence case everywhere except `eyebrow-label`, which is uppercase.
- **Frame choices as the user's, not a plan.** Real copy: "These are your chosen areas, not a prescribed care plan." / "No durations are goals."
- **Never diagnose or prescribe.** No supplement content or recommendations, no exercise intensity or progression, no claims of HIPAA compliance or end-to-end encryption. Real copy: "Stillwell is an educational, user-chosen reflection tool. It does not diagnose, prescribe treatment, or replace clinical care."
- **Keep the safety boundary visible** on any screen where a person records symptoms. Real copy: "Not for a new injury or an emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now."
- **Symptoms are noticed, not scored.** Scales run from "Less noticeable" to "More noticeable", 0–10.
- No emoji. Icons are line icons only (see Iconography).

## Visual foundations

### Colour

- Page ground is always `background` (warm paper). Content sits on one `card` panel per page.
- Set ink in `foreground` on `background` and `card-foreground` inside cards. Use `muted-foreground` for every helper line, description and fine print.
- `primary` (botanical green) is for the single main action, progress and selected state. Never use it for large decorative fields inside the product.
- `secondary` is the selected/info tint: selected choice cards, the "you are in control" note and active chips.
- `accent` (clay) supports; it never carries an action. `brand-dot` is the one warm point in the identity.
- The emergency boundary note uses `notice`, `notice-border`, `notice-title` and `notice-body`. Do not reuse that clay surface for anything else, so it keeps its meaning.
- Errors use `error` with `error-foreground`, always written as a full sentence.
- `destructive` appears only on delete actions, and always behind a confirmation.

### Type

- Headings are Fraunces (`serif`): `display-xl` on desktop scaling down to `display-md` on phones, weight 400. The wordmark is `wordmark`, lowercase "stillwell".
- Interface and body text are DM Sans (`sans`): `label` for questions and titles, `body` for running copy, `caption` for descriptions, `micro` for fine print.
- An `eyebrow-label` sits above each page heading, in `eyebrow`, preceded by a 22px `eyebrow-rule` line.

### Shape, spacing and depth

- Every button and chip is a pill (`radius-pill`), at least `space-12` (48px) tall for primary actions.
- The page panel uses `radius-panel` (28px); choice cards `radius-choice` (20px); inner cards, notices and the consent row `radius-inner` (16px); fields `radius-field` (12px).
- Spacing follows a 4px base: `space-4` inner padding, `space-5` panel padding on phones and `space-8` on desktop, `space-3` between choice cards.
- Layout is one centred column (about 760px wide for flows), single-column forms on phones, choice cards two-up from tablet width.
- Depth is almost flat: borders are `border` hairlines, and only the main panel casts `shadow-panel`. No heavy shadows, gradients on controls or coloured left-border cards.

### States

- Focus: a solid 3px outline in `ring` with a 3px offset on every interactive element.
- Selected choice: `secondary` fill, `selected-border`, plus a check icon so selection never relies on colour alone.
- Hover on a choice card: border moves to `choice-border-hover`. Hover on primary: `primary-hover`.
- Disabled: 45% opacity and a not-allowed cursor; still visible and labelled.

### Motion

Content settles in gently: fade up 10px over 0.65s ease-out, with later elements 0.12s behind. Respect reduced-motion settings by turning all animation off.

### Imagery

Soft botanical fields only: layered sage, cream and clay ovals over a very faint dot grain. No photos of injuries, brains or clinical settings.

## Iconography

Lucide line icons at 16–19px, stroke in the surrounding text colour or `ring`. Common ones: arrow-left, arrow-right, check, circle-help (info notes), shield-check (privacy), leaf (reassurance). No emoji, no filled icons.

## Brand mark

Use the Stillwell mark (Logos group) at 36px beside the `wordmark`. Its colours are fixed (`brand-fill`, `brand-ring`, `brand-core`, `brand-dot`); never recolour, outline or place it on `primary`.

## Accessibility notes

- Text pairs named in the colour tokens' usage notes meet 4.5:1 in light theme.
- Two source values are kept exact but miss their target: `input` borders (1.3:1) and `notice-body` (4.2:1). Pair fields with a visible label and `field` fill, and keep essential boundary wording in `notice-title`.
- The live app still uses some lighter greys for helper text (about 3.4–4.0:1). New screens should use `muted-foreground` instead.
- The product ships light-only today. The dark theme is derived from the app's declared dark values and has not been used in production.
