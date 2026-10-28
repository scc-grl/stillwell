# Patient journal datebook

The **Patient journal · past check-ins** preview demonstrates how Stillwell
foundations and core components compose into a patient-facing journal screen. It
is an illustrative design-system example, not a live patient record or a
production data component.

## Composition

- Keep the page title and short explanation above the date index and selected
  entry.
- Group saved dates by month. Use a compact date tile, a short response summary,
  and a restrained selected state. Offer a 30-day filter and an all-dates filter.
- On wide screens, place the index beside the selected day. At narrow widths,
  stack the index before the selected-day detail.
- Use card surfaces for the selected entry and each symptom. Show the four
  patient-reported scale labels and a segmented indicator; keep the words
  visible so color is never the only signal.
- Unanswered symptoms remain “Not recorded.” Do not interpolate between days or
  present the indicator as a diagnosis, score, or target.
- Keep notes separate from symptom responses and label illustrative content
  clearly in previews.

## Foundations and components

The preview uses semantic background, foreground, muted, border, secondary, and
primary tokens. It composes the existing Card and Button components with the
Fraunces display family, DM Sans interface text, rounded surfaces, and Lucide
line icons. Product pages remain responsible for real data, authentication,
accessibility state, and edit/delete behavior.
