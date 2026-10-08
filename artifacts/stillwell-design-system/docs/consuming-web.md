# Consuming Stillwell Design System in web apps

Read `artifacts/stillwell-design-system/docs/AGENTS.md` first. This guide covers
React/Vite and other shadcn/Tailwind web consumers. If the app already contains
a local theme or component library, also read
`artifacts/stillwell-design-system/docs/migrating-web.md` before writing UI.

## Fonts

DM Sans and Fraunces are bundled as portable font faces in the generated web theme. Do not introduce substitute fonts. Menlo/monospace is a system stack for code references.

## Theme

Import this package's theme once from the app's main CSS:

```css
@import "@workspace/stillwell-design-system/styles.css";
```

`styles.css` already imports Tailwind, its plugins, and this package's token
theme. It also registers this package's component sources. Do not add a separate
Tailwind import or a `node_modules` source path in a Tailwind v4 consumer.
Tailwind v3 consumers keep their existing `@tailwind` directives and add
`node_modules/@workspace/stillwell-design-system/src/components` to `content`.

## Components and helpers

Current pilot exports Button, Card (and its subcomponents), Input, Textarea, Checkbox, tokens, styles, and cn. Import these directly:

```tsx
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { cn } from "@workspace/stillwell-design-system/lib/utils";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
```

Use the package component whenever it provides the required family. Keep
product-specific compositions in the app, but compose them from package
primitives rather than recreating those primitives locally.

Toast and other catalog families are pending and are not exported yet. Do not migrate the existing recovery app until its required families are implemented.

## Verify

After wiring the workspace dependency, import and render
`@workspace/stillwell-design-system/components/ui/button`. Run the app's typecheck
and dev server. The import must resolve and the Button must use this package's
theme before broader UI work begins.

## Ongoing rules

- Keep one source of theme variables.
- Import package-provided primitives and helpers from the package path.
- Add reusable product-agnostic components to this package first.
- For a non-shadcn app, use the tokens as the source of truth and adapt existing
  components to the token CSS variables without copying token values.
