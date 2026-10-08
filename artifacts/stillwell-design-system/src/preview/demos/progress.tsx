import * as M from '../../components/ui/progress';
import { Frame } from '../parts';
import * as React from 'react';
import { Button } from '../../components/ui/button';

export function ProgressDemo() {
  const [value,setValue]=React.useState(40);return <Frame><M.Progress value={value} aria-label="Illustrative progress"/><p className="text-xs text-muted-foreground">Example value {value}% — not a recovery target.</p><Button variant="outline" onClick={()=>setValue(value===100?0:Math.min(100,value+20))}>Change example value</Button><M.Progress value={0} aria-label="Empty example"/><M.Progress value={100} aria-label="Complete example"/></Frame>;
}
