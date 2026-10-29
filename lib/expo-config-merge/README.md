# Expo config merge compatibility

Expo's config package still depends on `deepmerge`, which has no patched release
for GHSA-gcqx-w48m-w2h4. The workspace overrides only that dependency with this
adapter around the maintained `@fastify/deepmerge` implementation.

Expo uses only the default two-argument merge function. The adapter preserves
nested merging, array concatenation, cloning, and enumerable symbol keys. It does
not implement deepmerge's custom options or `.all`, which Expo does not use.

The `query-string` patch elsewhere in this repository similarly preserves Expo
Router's existing API: it unwraps the ESM default export of the patched
`decode-uri-component` rather than forcing a breaking query-string major update.

Remove these compatibility measures when Expo supports safe upstream versions.
