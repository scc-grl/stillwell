import * as M from '../../components/ui/radio-group';
import { Frame } from '../parts';
import * as React from 'react';

export function RadioGroupDemo() {
  const [value,setValue]=React.useState('self');return <Frame><M.RadioGroup value={value} onValueChange={setValue}><label className="flex items-center gap-3 text-sm"><M.RadioGroupItem value="self"/>First choice</label><label className="flex items-center gap-3 text-sm"><M.RadioGroupItem value="supported"/>Second choice</label><label className="flex items-center gap-3 text-sm text-muted-foreground"><M.RadioGroupItem value="disabled" disabled/>Unavailable</label></M.RadioGroup><p role="status" className="text-xs text-muted-foreground">Selected: {value}</p></Frame>;
}
