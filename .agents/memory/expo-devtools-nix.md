---
name: Expo DevTools on Nix
description: A nonfatal React Native DevTools library issue seen when starting Expo Go workflows.
---

On this Replit Nix environment, Metro and the Expo Go QR/web endpoints can start even when the optional React Native DevTools process fails to load `libglib-2.0.so.0`. Treat the DevTools failure as optional unless Metro or app loading also fails.

**Why:** The missing shared library prevents the optional local DevTools process, not the Metro bundler or Expo Go package server.

**How to apply:** When Expo reports this error, verify Metro/QR availability and app preview separately before treating startup as failed.
