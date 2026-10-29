# How it works demo · Round 3 (hi-fi) — design reference

Approved design: https://claude.ai/artifact/Se7FJnzKqUfEvLthf2Cytg (private canvas; these files are a copy of every screen at approval).
Tracking issue: see the `[Design] Website – How it works demo, round 3 hi-fi` issue.

Each `*.dc.html` file is one screen of the canvas. It is plain HTML with inline styles, plus a tiny template layer (`<x-dc>`, `<sc-for>`, `<sc-if>`, `{{value}}`) and a `Component` class at the bottom that supplies sample data and tap behaviour. Treat the markup, copy, spacing and colours as the spec; rebuild the screens in the app's React + Tailwind + Stillwell design-system components. Do not ship these files or their template layer.

| File | Screen | Route suggestion |
|---|---|---|
| Main.dc.html | Landing: "Two people, one recovery" (Maya and Ray cards) | `/demo` (How it works) |
| Story.dc.html | 1 · Tell us your story (sample stories, talk, free text) | `/demo/intake` |
| Reading.dc.html | Reading her story (AI call in flight) | `/demo/intake` (state) |
| Summary.dc.html | 2 · Summary (About the injury, Symptoms on the 4-step scale) | `/demo/intake` (state) |
| Stage.dc.html | 3 · Where you might be today | `/demo/intake` (state) |
| Emergency.dc.html | What if: a danger sign in the story | `/demo/intake` (state) |
| Dashboard.dc.html | Maya: dashboard, day 28 (mirrors the live patient dashboard) | `/demo/dashboard` |
| Journal.dc.html | Maya: today's journal entry (mirrors the live journal) | `/demo/journal` |
| Ray-Patients.dc.html | Ray: your patients | `/demo/clinician` |
| Ray-Intake.dc.html | Ray: Maya's intake summary | `/demo/clinician/intake` |
| Ray-Insights.dc.html | Ray: Maya's insights | `/demo/clinician/insights` |
| Ray-Journal.dc.html | Ray: Maya's journal | `/demo/clinician/journal` |
| Ray-Day.dc.html | Ray: one day in detail | `/demo/clinician/journal/26` |
| Ray-Messages.dc.html | Ray: messages | `/demo/clinician/messages` |

`canvas.json` holds the board order and titles.
