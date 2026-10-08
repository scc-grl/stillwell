import * as M from '../../components/ui/toggle-group';
import { Frame } from '../parts';
import * as React from 'react';
import * as Icon from 'lucide-react';

export function ToggleGroupDemo() {
  const [value,setValue]=React.useState('first');return <Frame><M.ToggleGroup type="single" value={value} onValueChange={setValue} variant="outline"><M.ToggleGroupItem value="first" aria-label="First choice">First</M.ToggleGroupItem><M.ToggleGroupItem value="second" aria-label="Second choice">Second</M.ToggleGroupItem><M.ToggleGroupItem value="disabled" disabled aria-label="Unavailable choice">Unavailable</M.ToggleGroupItem></M.ToggleGroup><M.ToggleGroup type="multiple" defaultValue={['bold']} size="sm"><M.ToggleGroupItem value="bold" aria-label="Bold"><Icon.Bold/></M.ToggleGroupItem><M.ToggleGroupItem value="italic" aria-label="Italic"><Icon.Italic/></M.ToggleGroupItem></M.ToggleGroup><p role="status" className="text-xs text-muted-foreground">Single selection: {value || 'none'}</p></Frame>;
}
