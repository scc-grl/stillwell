---
name: Shared native control types
description: Keep shared native control refs portable across workspace peer type instances.
---

Expose small platform-neutral imperative handles from shared native controls rather than leaking React Native View instance types across package boundaries.

**Why:** Separate pnpm peer-type instances produced incompatible native View refs even with compatible runtimes; native style types differed across those instances. An imperative handle preserves real accessibility focus without casts or dependency replacements.

**How to apply:** Share methods with primitive signatures, keeping native element refs and platform accessibility behavior inside the component. Do not swap React or React Native versions simply to force a consumer ref cast.
