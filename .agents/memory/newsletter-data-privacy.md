---
name: Newsletter data privacy
description: Privacy boundary for email addresses submitted through Stillwell community updates.
---

Stillwell newsletter email addresses must never be sent to analytics or application/request logs.

**Why:** The user explicitly set this privacy boundary for the community subscription flow.

**How to apply:** Keep email values out of custom analytics properties, request bodies in logs, error output, and other tracking events. Only non-identifying interaction outcomes may be considered for future analytics.
