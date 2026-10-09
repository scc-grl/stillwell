# checkbox

Status: implemented (pilot).

Source: artifacts/website/src/components/ui/checkbox.tsx, lines 1–27. Local project license is not declared here; upstream primitives retain their licenses. Public export: @workspace/stillwell-design-system/components/ui/checkbox.

Dependencies: Radix Checkbox, Lucide Check, cn. No app API or auth dependencies.

Product appearance evidence: artifacts/website/src/pages/QuizPage.tsx (button/choiceCard/field definitions and consent), artifacts/website/src/pages/DashboardPage.tsx (panel/tinyButton/cta/field definitions), artifacts/website/src/index.css:472–540 (fonts, mark, focus, motion). Public props, refs, native behavior and underlying primitives are retained; only imports and styles are adapted to the displayed product. Source declares default/sm/lg/icon button sizes and six variants; native input and textarea props; Radix checked, disabled, controlled/uncontrolled checkbox states. Stories cover these.

## Original implementation

```tsx
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('grid place-content-center text-current')}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
```
