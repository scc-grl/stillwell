---
name: Canvas preview verification
description: Verify canvas iframe destinations separately from app-preview screenshots.
---

Use the actual development hostname when registering canvas preview URLs, and check the registered iframe destination before presenting it.

**Why:** App-preview screenshots load the local artifact proxy, not necessarily the URL saved on the canvas frame. A mistyped canvas hostname can leave a broken frame even while screenshots and browser tests of the correct route pass.

**How to apply:** Obtain the current development host rather than retyping it, compare each changed frame's registered host and path with the verified preview, and set live state only with the correct URL and suggested actions.
