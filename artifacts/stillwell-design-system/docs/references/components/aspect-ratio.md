# aspect-ratio

Status: pending. Chunk 4.

Source: artifacts/stillwell-recovery/src/components/ui/aspect-ratio.tsx:1–5. License: local project unspecified; retain upstream primitive licenses.

Public export: @workspace/stillwell-design-system/components/ui/aspect-ratio. Exports: AspectRatio. Dependencies: @radix-ui/react-aspect-ratio. Local component peers: none. Usage evidence: .

Before implementation, read the original source, referenced peers and caller examples. Keep the source behavior/API and rewrite aliases to package-relative imports; theme to tokens. Add exactly one family demo. Do not build before pilot approval.

## Original implementation snapshot

```tsx
import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio';

const AspectRatio = AspectRatioPrimitive.Root;

export { AspectRatio };
```

Import-only adaptation: private aliases rewritten to package-relative peers. Styling resolves through the shared token theme; original exports and runtime primitives are retained.
