import * as M from '../../components/ui/select';
import { Frame } from '../parts';
import * as React from 'react';

export function SelectDemo() {
  const [value,setValue]=React.useState('');return <Frame><M.Select value={value} onValueChange={setValue}><M.SelectTrigger aria-label="Choose a preview option" className="max-w-sm"><M.SelectValue placeholder="Choose an option…"/></M.SelectTrigger><M.SelectContent><M.SelectGroup><M.SelectLabel>Example options</M.SelectLabel><M.SelectItem value="first">First choice</M.SelectItem><M.SelectItem value="second">Second choice</M.SelectItem></M.SelectGroup><M.SelectSeparator/><M.SelectItem value="unavailable" disabled>Unavailable</M.SelectItem></M.SelectContent></M.Select><p role="status" className="text-xs text-muted-foreground">Selected: {value || 'none'}</p><M.Select disabled><M.SelectTrigger aria-label="Unavailable select" className="max-w-sm"><M.SelectValue placeholder="Unavailable"/></M.SelectTrigger></M.Select></Frame>;
}
