# Stillwell Content

This folder is **content, not code**. It is Stillwell's research library for patient resources and marketing: evidence-based pieces on concussion and TBI recovery across five pillars.

> **Note for coding agents (Replit, etc.):** do not build, import, refactor, lint, or delete anything in this folder. It is not part of the app. Approved pieces reach the app through GitHub issues labeled `resource-content`. Build pages from those issues, not by reading this folder directly.

## Structure
```
stillwell-content/
  research-log.md                     one line per piece (date, pillar, topic, status, link)
  research/<pillar>/<YYYY-MM-DD>-<slug>/
      article.md                      public, reader-facing piece
      internal.md                     internal only: SEO & social kit, expert outreach, reviewer notes
```
Pillars: `nutrition`, `audio`, `visual`, `physical`, `cognitive`, `cross-pillar`.

## Workflow
1. **Draft:** the research agent opens a pull request titled `[Draft] <Pillar>: <Title>` on a `draft/...` branch.
2. **Review:** the founder comments on lines or edits directly in the PR.
3. **Approve:** the founder merges. Nothing is public until it's merged.
4. **Publish:** the agent opens a `resource-content` issue with the final article for the Replit agent to build the page.

`internal.md` files are never published.
