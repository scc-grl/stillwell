# skeleton

Status: pending. Chunk 2.

Source: artifacts/website/src/components/ui/skeleton.tsx:1–15. License: local project unspecified; retain upstream primitive licenses.

Public export: @workspace/stillwell-design-system/components/ui/skeleton. Exports: Skeleton. Dependencies: . Local component peers: none. Usage evidence: sidebar.tsx.

Before implementation, read the original source, referenced peers and caller examples. Keep the source behavior/API and rewrite aliases to package-relative imports; theme to tokens. Add exactly one family demo. Do not build before pilot approval.

## Original implementation snapshot

```tsx
import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-primary/10', className)}
      {...props}
    />
  );
}

export { Skeleton };
```

Import-only adaptation: private aliases rewritten to package-relative peers. Styling resolves through the shared token theme; original exports and runtime primitives are retained.
