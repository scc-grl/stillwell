# label

Status: pending. Chunk 2.

Source: artifacts/website/src/components/ui/label.tsx:1–25. License: local project unspecified; retain upstream primitive licenses.

Public export: @workspace/stillwell-design-system/components/ui/label. Exports: Label. Dependencies: react, @radix-ui/react-label, class-variance-authority. Local component peers: none. Usage evidence: field.tsx, form.tsx.

Before implementation, read the original source, referenced peers and caller examples. Keep the source behavior/API and rewrite aliases to package-relative imports; theme to tokens. Add exactly one family demo. Do not build before pilot approval.

## Original implementation snapshot

```tsx
'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
```

Import-only adaptation: private aliases rewritten to package-relative peers. Styling resolves through the shared token theme; original exports and runtime primitives are retained.
