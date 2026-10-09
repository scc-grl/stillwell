# separator

Status: pending. Chunk 2.

Source: artifacts/website/src/components/ui/separator.tsx:1–28. License: local project unspecified; retain upstream primitive licenses.

Public export: @workspace/stillwell-design-system/components/ui/separator. Exports: Separator. Dependencies: react, @radix-ui/react-separator. Local component peers: none. Usage evidence: button-group.tsx, field.tsx, item.tsx, sidebar.tsx.

Before implementation, read the original source, referenced peers and caller examples. Keep the source behavior/API and rewrite aliases to package-relative imports; theme to tokens. Add exactly one family demo. Do not build before pilot approval.

## Original implementation snapshot

```tsx
import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/lib/utils';

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = 'horizontal', decorative = true, ...props },
    ref,
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className,
      )}
      {...props}
    />
  ),
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
```

Import-only adaptation: private aliases rewritten to package-relative peers. Styling resolves through the shared token theme; original exports and runtime primitives are retained.
