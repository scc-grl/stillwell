---
name: GitHub source placement
description: Why the GitHub source folder differs from the live Replit workspace layout.
---

Keep the live workspace's directory layout unchanged when syncing the site into GitHub's `stillwell-site/` folder.

**Why:** The user requested that folder on GitHub's main branch, preservation of existing design exports, and no changes to application code, design, or behavior.

**How to apply:** Prepare future updates in an isolated Git working copy based on GitHub's current history. Copy the site and its required workspace packages/configuration into `stillwell-site/`, preserve `design/`, verify source files match the live workspace, and push normally. Do not push the workspace's root-layout main directly over the folder-layout GitHub main. Exclude environment files, dependencies, generated outputs, and agent/reference-only files.
