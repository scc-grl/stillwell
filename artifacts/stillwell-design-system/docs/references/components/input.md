# input

Status: implemented (pilot).

Source: artifacts/stillwell-recovery/src/components/ui/input.tsx, lines 1–21. Local project license is not declared here; upstream primitives retain their licenses. Public export: @workspace/stillwell-design-system/components/ui/input.

Dependencies: React forwardRef, cn. No app API or auth dependencies.

Product appearance evidence: artifacts/stillwell-recovery/src/pages/QuizPage.tsx (button/choiceCard/field definitions and consent), artifacts/stillwell-recovery/src/pages/DashboardPage.tsx (panel/tinyButton/cta/field definitions), artifacts/stillwell-recovery/src/index.css:472–540 (fonts, mark, focus, motion). Public props, refs, native behavior and underlying primitives are retained; only imports and styles are adapted to the displayed product. Source declares default/sm/lg/icon button sizes and six variants; native input and textarea props; Radix checked, disabled, controlled/uncontrolled checkbox states. Stories cover these.

## Original implementation

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
```
