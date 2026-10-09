# collapsible

Status: pending. Chunk 5.

Source: artifacts/website/src/components/ui/collapsible.tsx:1–11. License: local project unspecified; retain upstream primitive licenses.

Public export: @workspace/stillwell-design-system/components/ui/collapsible. Exports: Collapsible, CollapsibleTrigger, CollapsibleContent. Dependencies: @radix-ui/react-collapsible. Local component peers: none. Usage evidence: .

Before implementation, read the original source, referenced peers and caller examples. Keep the source behavior/API and rewrite aliases to package-relative imports; theme to tokens. Add exactly one family demo. Do not build before pilot approval.

## Original implementation snapshot

```tsx
'use client';

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
```

Import-only adaptation: private aliases rewritten to package-relative peers. Styling resolves through the shared token theme; original exports and runtime primitives are retained.
