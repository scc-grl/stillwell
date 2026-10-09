# textarea

Status: implemented (pilot).

Source: artifacts/website/src/components/ui/textarea.tsx, lines 1–21. Local project license is not declared here; upstream primitives retain their licenses. Public export: @workspace/stillwell-design-system/components/ui/textarea.

Dependencies: React forwardRef, cn. No app API or auth dependencies.

Product appearance evidence: artifacts/website/src/pages/QuizPage.tsx (button/choiceCard/field definitions and consent), artifacts/website/src/pages/DashboardPage.tsx (panel/tinyButton/cta/field definitions), artifacts/website/src/index.css:472–540 (fonts, mark, focus, motion). Public props, refs, native behavior and underlying primitives are retained; only imports and styles are adapted to the displayed product. Source declares default/sm/lg/icon button sizes and six variants; native input and textarea props; Radix checked, disabled, controlled/uncontrolled checkbox states. Stories cover these.

## Original implementation

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
```
