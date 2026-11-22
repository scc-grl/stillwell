---
name: TypeSafe score rubric limit
description: Provider rubric limits differ from the journal's rating choices.
---
Keep the journal's eleven choices (0–10) separate from TypeSafe's rubric position domain. Normalize model positions to the journal domain once; never normalize patient tap answers again.

**Why:** TypeSafe rejected eleven Score criteria with HTTP 422: at most ten criteria are supported. The resulting reader failure correctly entered fallback but prevented AI placement.

**How to apply:** Keep the compatibility conversion in the shared reader and expose original provider positions plus normalized scores in structured tracing. Test a real provider call after changing rubric size; fake clients do not enforce this external limit.
