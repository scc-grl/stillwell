---
name: Care-link privacy on static hosting
description: Why bearer-link privacy cannot rely only on React analytics wrappers or API-server headers.
---

Treat static website documents and API responses as separate privacy boundaries. A token page can be served by the artifact proxy without traversing Express, and published HTML can receive an analytics script that is absent in development.

**Why:** Inspection of the running deployment confirmed proxy-served static HTML with an injected asynchronous analytics tracker. Disabling app event calls alone does not prevent its automatic URL/referrer pageviews, and an Express response header is not sufficient for a document served outside Express.

Keep the restriction for the remainder of that document, not just while its pathname contains a token. An automatic tracker can report the previous private URL as the referrer on the next client-side pageview.

**How to apply:** Keep the early HTML privacy protection effective before third-party scripts and before client-side history changes, including authentication handoffs that temporarily leave the token route. Verify blocked analytics network traffic in a real browser rather than treating the absence of the tracker in development as proof. Preserve the authentication provider's necessary connections. Do not put care tokens in authentication query strings or assume that a static document inherits API middleware.
